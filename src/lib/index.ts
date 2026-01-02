// place files you want to import through the `$lib` alias in this folder.

/**
 * Fetches Friday Mincha and Shabbat Mincha/Maariv times from Shomrei Torah calendar for specified dates.
 * @param fridayDate - JS Date object for Friday
 * @param shabbatDate - JS Date object for Shabbat
 * Returns an object: { fridayMincha, shabbatMincha, shabbatMaariv }
 */
export async function fetchShomreiTorahTimes(fridayDate: Date, shabbatDate: Date): Promise<{
  fridayMincha: string | null;
  shabbatMincha: string | null;
  shabbatMaariv: string | null;
}> {
  // Format dates as YYYY-MM-DD
  function formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  const fridayStr = formatDate(fridayDate);
  const shabbatStr = formatDate(shabbatDate);

  // Build the URL with the specified date pattern
  const url = `https://shomreitorah.shulcloud.com/calendar?advanced=Y&calendar=&date_start=specific+date&date_start_x=0&date_start_date=${fridayStr}&has_second_date=Y&date_end=specific+date&date_end_x=0&date_end_date=${shabbatStr}&view=week&day_view_horizontal=N`;

  console.debug('Fetching URL:', url);
  
  let res;
  try {
    res = await fetch(url);
  } catch (error) {
    throw new Error(`Failed to fetch calendar: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  if (!res.ok) {
    throw new Error(`Failed to fetch calendar: HTTP ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  
  console.debug('Fetched HTML length:', html.length);

  // Extract day block by id (day5 for Friday, day6 for Shabbat in week view)
  function extractDayBlock(html: string, dayId: string): string | null {
    const regex = new RegExp(`<div[^>]*id="${dayId}"[^>]*>([\\s\\S]*?)</div>(?=\\s*<div[^>]*class="calendar_day_view"|\\s*</div>)`, 'i');
    const match = html.match(regex);
    console.debug(`Extracting day block for ${dayId}:`, match ? 'found' : 'not found');
    if (match) {
      console.debug(`Day block preview (${dayId}):`, match[0].slice(0, 500) + '...');
    }
    return match ? match[0] : null;
  }

  // Extract times from event rows in a day block
  function extractTimes(dayBlock: string | null, eventNames: string[]): Record<string, string | null> {
    const result: Record<string, string | null> = {};
    if (!dayBlock) {
      eventNames.forEach(name => result[name] = null);
      return result;
    }

    // Match table rows with time and event name
    const rowRegex = /<tr[^>]*>[\s\S]*?<span class="ce_time">([^<]+)<\/span>[\s\S]*?<div class="ce_event_name">\s*([^<]+?)\s*<\/div>/g;
    let match;
    const found: Record<string, string> = {};

    while ((match = rowRegex.exec(dayBlock)) !== null) {
      const time = match[1].trim();
      const name = match[2].trim();
      found[name] = time;
      console.debug(`Found event: "${name}" at ${time}`);
    }

    // Match event names (exact or partial)
    eventNames.forEach(eventName => {
      if (found[eventName]) {
        result[eventName] = found[eventName];
      } else {
        // Try partial match
        const partialMatch = Object.entries(found).find(([name]) => 
          name.toLowerCase().includes(eventName.toLowerCase()) || 
          eventName.toLowerCase().includes(name.toLowerCase())
        );
        result[eventName] = partialMatch ? partialMatch[1] : null;
      }
    });

    return result;
  }

  // Extract blocks for Friday and Shabbat
  const fridayBlock = extractDayBlock(html, 'day5');
  const shabbatBlock = extractDayBlock(html, 'day6');

  // Extract times for each day
  const fridayTimes = extractTimes(fridayBlock, ['Mincha/ Kabbalat Shabbat', 'Mincha']);
  const shabbatTimes = extractTimes(shabbatBlock, ['Mincha', 'Maariv']);

  // Get the best times (prefer specific over general)
  const fridayMincha = fridayTimes['Mincha/ Kabbalat Shabbat'] || fridayTimes['Mincha'];
  const shabbatMincha = shabbatTimes['Mincha'];
  const shabbatMaariv = shabbatTimes['Maariv'];

  console.debug('Final result:', { fridayMincha, shabbatMincha, shabbatMaariv });

  return {
    fridayMincha,
    shabbatMincha,
    shabbatMaariv,
  };
}
