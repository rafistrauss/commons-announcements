#!/usr/bin/env node

import { parseShomreiTorahHtml } from '../src/lib/index.js';
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROXY_URL = process.env.SHULCLOUD_PROXY_URL;
const PROXY_TOKEN = process.env.SHULCLOUD_PROXY_TOKEN;

/**
 * Fetches a ShulCloud calendar page.
 * Routes through the Pi proxy (SHULCLOUD_PROXY_URL) when set,
 * otherwise tries a direct fetch (may be blocked by ShulCloud's WAF).
 */
async function fetchCalendarHtml(url) {
  if (PROXY_URL) {
    const proxyTarget = `${PROXY_URL}?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyTarget, {
      headers: { 'Authorization': `Bearer ${PROXY_TOKEN}` },
    });
    if (!res.ok) throw new Error(`Proxy returned HTTP ${res.status}`);
    return res.text();
  }

  // Direct fetch fallback (blocked by ShulCloud WAF for most IPs since ~Aug 2026)
  console.warn('⚠ SHULCLOUD_PROXY_URL not set — direct fetch may return 406');
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.text();
}

/**
 * Updates minyan times for the next 4 weeks
 */
async function updateMinyanTimes() {
  console.log('Starting minyan times update...');

  if (PROXY_URL) {
    console.log(`Using Pi proxy: ${PROXY_URL}`);
  }

  // Load existing data - go up one directory from scripts/ to project root
  const jsonPath = process.argv[2] || join(__dirname, '..', 'src', 'lib', 'minyan-times.json');
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

  let successCount = 0;
  for (const friday of fridays) {
    const saturday = new Date(friday);
    saturday.setDate(friday.getDate() + 1);

    const fridayKey = friday.toISOString().slice(0, 10);
    const saturdayStr = saturday.toISOString().slice(0, 10);
    const url = `https://shomreitorah.shulcloud.com/calendar?advanced=Y&calendar=&date_start=specific+date&date_start_x=0&date_start_date=${fridayKey}&has_second_date=Y&date_end=specific+date&date_end_x=0&date_end_date=${saturdayStr}&view=week&day_view_horizontal=N`;

    try {
      console.log(`Fetching times for ${fridayKey}...`);
      const html = await fetchCalendarHtml(url);
      const times = parseShomreiTorahHtml(html);

      data.times[fridayKey] = {
        fridayMincha: times.fridayMincha,
        shabbatMincha: times.shabbatMincha,
        shabbatMaariv: times.shabbatMaariv,
      };

      successCount++;
      console.log(`✓ Updated times for ${fridayKey}:`, data.times[fridayKey]);
    } catch (error) {
      console.error(`✗ Failed to fetch times for ${fridayKey}:`, error.message);
      // Keep existing data if fetch fails
    }

    // Add delay between requests to be polite
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (successCount === 0) {
    console.error('✗ All fetches failed — no times were updated');
    process.exit(1);
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