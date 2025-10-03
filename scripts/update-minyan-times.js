#!/usr/bin/env node

import { fetchShomreiTorahTimes } from '../src/lib/index.js';
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Updates minyan times for the next 4 weeks
 */
async function updateMinyanTimes() {
  console.log('Starting minyan times update...');
  
  // Load existing data - go up one directory from scripts/ to project root
  const jsonPath = join(__dirname, '..', 'static', 'minyan-times.json');
  let data;
  try {
    const existing = readFileSync(jsonPath, 'utf8');
    data = JSON.parse(existing);
  } catch (error) {
    console.log('Creating new minyan times file');
    data = { lastUpdated: null, times: {} };
  }

  // Get the next 4 Fridays
  const today = new Date();
  const daysUntilFriday = (5 - today.getDay() + 7) % 7;
  const nextFriday = new Date(today);
  nextFriday.setDate(today.getDate() + daysUntilFriday);
  
  const fridays = [];
  for (let i = 0; i < 4; i++) {
    const friday = new Date(nextFriday);
    friday.setDate(nextFriday.getDate() + (i * 7));
    fridays.push(friday);
  }

  console.log('Fetching times for Fridays:', fridays.map(f => f.toISOString().slice(0, 10)));

  // Fetch times for each Friday
  for (const friday of fridays) {
    const saturday = new Date(friday);
    saturday.setDate(friday.getDate() + 1);
    
    const fridayKey = friday.toISOString().slice(0, 10);
    
    try {
      console.log(`Fetching times for ${fridayKey}...`);
      const times = await fetchShomreiTorahTimes(friday, saturday);
      
      data.times[fridayKey] = {
        fridayMincha: times.fridayMincha,
        shabbatMincha: times.shabbatMincha,
        shabbatMaariv: times.shabbatMaariv,
      };
      
      console.log(`✓ Updated times for ${fridayKey}:`, data.times[fridayKey]);
    } catch (error) {
      console.error(`✗ Failed to fetch times for ${fridayKey}:`, error.message);
      // Keep existing data if fetch fails
    }
    
    // Add delay between requests to be polite
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Update timestamp
  data.lastUpdated = new Date().toISOString();

  // Write updated data
  writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  console.log(`✓ Minyan times updated successfully at ${data.lastUpdated}`);
  console.log(`Updated ${Object.keys(data.times).length} date entries`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateMinyanTimes().catch(console.error);
}

export { updateMinyanTimes };