// place files you want to import through the `$lib` alias in this folder.

/**
 * Helper function to retry a fetch operation with exponential backoff
 */
async function fetchWithRetry(url: string, options: RequestInit = {}, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // Retry on server errors (5xx) or rate limiting (429)
      const shouldRetry = (response.status >= 500 || response.status === 429) && attempt < maxRetries - 1;
      
      if (shouldRetry) {
        const delay = 1000 * Math.pow(2, attempt);
        console.debug(`Attempt ${attempt + 1} failed with status ${response.status}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.debug(`Attempt ${attempt + 1} failed with error: ${lastError.message}`);
      
      // Retry on network errors (but not on last attempt)
      if (attempt < maxRetries - 1) {
        const delay = 1000 * Math.pow(2, attempt);
        console.debug(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Fetch failed after retries');
}

/**
 * Parses Friday Mincha and Shabbat Mincha/Maariv times from Shomrei Torah calendar HTML.
 * Expects HTML from a week-view calendar page (day5 = Friday, day6 = Shabbat).
 */
export function parseShomreiTorahHtml(html: string): {
  fridayMincha: string | null;
  shabbatMincha: string | null;
  shabbatMaariv: string | null;
} {
  // Extract day block by id (day5 for Friday, day6 for Shabbat in week view)
  function extractDayBlock(h: string, dayId: string): string | null {
    const regex = new RegExp(`<div[^>]*id="${dayId}"[^>]*>([\\s\\S]*?)</div>(?=\\s*<div[^>]*class="calendar_day_view"|\\s*</div>)`, 'i');
    const match = h.match(regex);
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

  const fridayBlock = extractDayBlock(html, 'day5');
  const shabbatBlock = extractDayBlock(html, 'day6');

  const fridayTimes = extractTimes(fridayBlock, ['Mincha/ Kabbalat Shabbat', 'Mincha']);
  const shabbatTimes = extractTimes(shabbatBlock, ['Mincha', 'Maariv']);

  const fridayMincha = fridayTimes['Mincha/ Kabbalat Shabbat'] || fridayTimes['Mincha'];
  const shabbatMincha = shabbatTimes['Mincha'];
  const shabbatMaariv = shabbatTimes['Maariv'];

  console.debug('Final result:', { fridayMincha, shabbatMincha, shabbatMaariv });

  return { fridayMincha, shabbatMincha, shabbatMaariv };
}

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
  function formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  const fridayStr = formatDate(fridayDate);
  const shabbatStr = formatDate(shabbatDate);

  const url = `https://shomreitorah.shulcloud.com/calendar?advanced=Y&calendar=&date_start=specific+date&date_start_x=0&date_start_date=${fridayStr}&has_second_date=Y&date_end=specific+date&date_end_x=0&date_end_date=${shabbatStr}&view=week&day_view_horizontal=N`;

  console.debug('Fetching URL:', url);

  let res;
  try {
    res = await fetchWithRetry(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
  } catch (error) {
    throw new Error(`Failed to fetch calendar: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch calendar: HTTP ${res.status} ${res.statusText}`);
  }
  const html = await res.text();

  console.debug('Fetched HTML length:', html.length);
  return parseShomreiTorahHtml(html);
}
