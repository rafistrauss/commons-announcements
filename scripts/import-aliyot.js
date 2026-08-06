#!/usr/bin/env node
// Import old_list.md and leining CSV into Firestore aliyot-signups collection.
// Usage: node scripts/import-aliyot.js [--dry-run]

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');

const firebaseConfig = {
  apiKey: 'AIzaSyB6iRU3ltlrq6BD3uRLqyahmixaneTcT6M',
  authDomain: 'aliyot-signups.firebaseapp.com',
  projectId: 'aliyot-signups',
  storageBucket: 'aliyot-signups.firebasestorage.app',
  messagingSenderId: '1034038430434',
  appId: '1:1034038430434:web:5aef189b3943dd9a06acbb'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------------------------------------------------------------------------
// Parse old_list.md
// ---------------------------------------------------------------------------
function parseOldList(text) {
  const people = [];
  let currentTribe = '';
  let isAlumni = false;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    // Section headings
    if (line === '**Kohen**') { currentTribe = 'Kohen'; isAlumni = false; continue; }
    if (line === '**Levi**')  { currentTribe = 'Levi';  isAlumni = false; continue; }
    if (line === '**Yisrael**') { currentTribe = 'Yisrael'; isAlumni = false; continue; }
    if (line.startsWith('Alumni:')) { isAlumni = true; currentTribe = ''; continue; }

    // Extract English name — everything before the first - or \-
    const nameMatch = line.match(/^([^*\-\\]+?)[\s\\]*[-–]/);
    if (!nameMatch) continue;
    const englishName = nameMatch[1].trim();
    if (!englishName) continue;

    // Extract all bold segments **…**
    const boldSegments = [...line.matchAll(/\*\*([^*]+)\*\*/g)].map(m => m[1].trim());
    if (boldSegments.length === 0) continue;

    let hebrewGivenName = '';
    let hebrewFatherName = '';

    if (boldSegments.length >= 2) {
      // Normal case: **given** בן **father**
      hebrewGivenName = boldSegments[0];
      hebrewFatherName = boldSegments[1];
    } else {
      // Single bold containing " בן ": **given בן father**
      const single = boldSegments[0];
      const benIdx = single.indexOf(' בן ');
      if (benIdx !== -1) {
        hebrewGivenName = single.slice(0, benIdx).trim();
        hebrewFatherName = single.slice(benIdx + 4).trim();
      } else {
        hebrewGivenName = single;
        hebrewFatherName = '';
      }
    }

    // Strip tribe suffixes הכהן / הלוי from father name (the app adds them on display)
    hebrewFatherName = hebrewFatherName
      .replace(/\s*הכהן$/, '')
      .replace(/\s*הלוי$/, '')
      .replace(/\s*הרב\s+/, '') // "הרב ברוך דוב" → "ברוך דוב"
      .trim();

    people.push({ englishName, hebrewGivenName, hebrewFatherName, tribe: currentTribe, alumni: isAlumni });
  }

  return people;
}

// ---------------------------------------------------------------------------
// Parse leining CSV
// ---------------------------------------------------------------------------
function parseLeiningCsv(text) {
  // Map: englishName (trimmed) → Set of parsha names
  const leiners = new Map();

  function addLeiner(name, parsha) {
    if (!name || name.trim() === '--' || !parsha || !parsha.trim()) return;
    const n = name.trim();
    if (!leiners.has(n)) leiners.set(n, new Set());
    leiners.get(n).add(parsha.trim());
  }

  for (const rawLine of text.split('\n')) {
    const cols = rawLine.split(',').map(c => c.trim());

    // The CSV has two table blocks:
    //   Block 1: starts at col 0 — groups of 3: [Parsha, Primary, Backup]
    //   Block 2: starts at col 1 (leading empty col) — groups of 3 starting from col 1
    // Detect the starting offset: if col[0] is empty, groups start at col 1.
    const offset = (cols[0] === '') ? 1 : 0;

    for (let i = offset; i + 2 < cols.length; i += 3) {
      const parsha = cols[i];
      const primary = cols[i + 1];
      const backup = cols[i + 2];

      // Skip header rows and blank parsha cells
      if (!parsha || parsha === 'Parsha Hebrew') continue;

      addLeiner(primary, parsha);
      addLeiner(backup, parsha);
    }
  }

  return leiners;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const mdPath  = join(__dirname, '..', 'src', 'routes', 'aliyot-signup', 'old_list.md');
  const csvPath = join(__dirname, '..', 'src', 'routes', 'aliyot-signup', 'Commons Minyan Leining Chart - 2025-26.csv');

  const people  = parseOldList(readFileSync(mdPath, 'utf8'));
  const leiners = parseLeiningCsv(readFileSync(csvPath, 'utf8'));

  console.log(`Parsed ${people.length} people from old_list.md`);
  console.log(`Parsed ${leiners.size} leiners from CSV`);

  if (DRY_RUN) {
    console.log('\n--- DRY RUN: records that would be inserted ---');
    for (const person of people) {
      const parshiot = [...(leiners.get(person.englishName) ?? [])];
      console.log(JSON.stringify({ ...person, parshiot }, null, 2));
    }
    console.log('\n--- CSV leiners not found in old_list.md ---');
    const mdNames = new Set(people.map(p => p.englishName));
    for (const name of leiners.keys()) {
      if (!mdNames.has(name)) console.log(' ', name);
    }
    return;
  }

  const col = collection(db, 'aliyot-signups');
  let imported = 0;

  for (const person of people) {
    // Deterministic doc ID → re-running the script is idempotent (overwrites same doc).
    // Firestore rules allow create:true for aliyot-signups, so no auth needed.
    const docId = person.englishName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const parshiot = [...(leiners.get(person.englishName) ?? [])];
    const record = {
      englishName: person.englishName,
      email: '',
      hebrewGivenName: person.hebrewGivenName,
      hebrewFatherName: person.hebrewFatherName,
      tribe: person.tribe,
      alumni: person.alumni,
      davening: { canDaven: false, portions: [] },
      leining: {
        ability: parshiot.length > 0 ? 'can_help' : 'none',
        barMitzvahParsha: '',
        parshiot
      },
      submittedAt: serverTimestamp()
    };

    await setDoc(doc(col, docId), record);
    console.log(`  import: ${person.englishName} (${parshiot.length} parshiot)`);
    imported++;
  }

  console.log(`\nDone. Imported: ${imported}`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
