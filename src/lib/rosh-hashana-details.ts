import { JewishCalendar } from 'kosher-zmanim';

/**
 * Check if a date falls during Rosh Hashana
 * Rosh Hashana is 1-2 Tishrei
 */
export function isRoshHashanaDay(date: Date): boolean {
  const jewishCal = new JewishCalendar(date);
  const jewishMonth = jewishCal.getJewishMonth();
  const jewishDay = jewishCal.getJewishDayOfMonth();

  // Rosh Hashana: 1-2 Tishrei (month 7)
  return jewishMonth === 7 && (jewishDay === 1 || jewishDay === 2);
}

/**
 * Get the day number of Rosh Hashana (1 or 2)
 * Returns null if not a Rosh Hashana day
 */
export function getRoshHashanaDayNumber(date: Date): number | null {
  const jewishCal = new JewishCalendar(date);
  const jewishMonth = jewishCal.getJewishMonth();
  const jewishDay = jewishCal.getJewishDayOfMonth();

  if (jewishMonth !== 7) return null;
  if (jewishDay === 1) return 1;
  if (jewishDay === 2) return 2;
  return null;
}

/**
 * Get Rosh Hashana Hebrew day name
 */
export function getRoshHashanaDayName(dayNumber: number): string {
  const names = [
    'יום ראשון של ראש השנה',
    'יום שני של ראש השנה',
  ];
  return names[dayNumber - 1] || 'ראש השנה';
}

/**
 * Get all civil dates for Rosh Hashana (Erev + 2 days), finding the nearest
 * upcoming (or currently ongoing) occurrence using the Jewish calendar.
 * Erev Rosh Hashana is 29 Elul, the day before 1 Tishrei — since the Jewish
 * year increments at Rosh Hashana, Erev and the holiday itself span two
 * different Jewish months (and years), so the generic getYomTovDateRange
 * helper (which assumes a single month) cannot be reused here.
 */
export function getRoshHashanaDateRange(): Date[] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  // Scan back up to 10 days so we catch a holiday that is currently in progress.
  const scan = new Date(today);
  scan.setDate(scan.getDate() - 10);
  scan.setHours(12, 0, 0, 0);

  for (let i = 0; i < 420; i++) {
    const cal = new JewishCalendar(scan);
    if (cal.getJewishMonth() === 7 && cal.getJewishDayOfMonth() === 1) {
      const erev = new Date(scan);
      erev.setDate(erev.getDate() - 1);
      return [erev, new Date(scan), new Date(scan.getFullYear(), scan.getMonth(), scan.getDate() + 1)];
    }
    scan.setDate(scan.getDate() + 1);
  }

  return [];
}

/**
 * Get Rosh Hashana-specific liturgical notices for a service
 */
export function getRoshHashanaLiturgicalNotices(
  date: Date,
  service: 'shacharit' | 'mincha' | 'maariv'
): { additions: string[]; omissions: string[] } {
  const dayNumber = getRoshHashanaDayNumber(date);
  if (!dayNumber) return { additions: [], omissions: [] };

  const additionsSet = new Set<string>();
  const omissions: string[] = [];
  const isShabbat = date.getDay() === 6;

  // Note: יעלה ויבא is NOT listed here as an "addition" — on the Yom Tov days
  // themselves, Shacharit/Mincha/Maariv all use the full Yom Tov Amidah
  // (the same festival-style middle brachah), where יעלה ויבא is mandatory,
  // fixed text rather than an optional insertion into a weekday Amidah.

  // Say "המלך הקדוש" instead of "האל הקדוש" in every Amidah during the Ten Days of Repentance
  additionsSet.add('המלך הקדוש');

  if (service === 'shacharit') {
    // No Hallel on Rosh Hashana
    additionsSet.add('תקיעת שופר');
    if (!isShabbat) {
      additionsSet.add('תשליך (after Mincha)');
    }
  }

  // Avinu Malkeinu is said at Shacharit and Mincha (not Maariv) on weekday Rosh Hashana
  if (!isShabbat && service !== 'maariv') {
    additionsSet.add('אבינו מלכנו');
  }

  // On Shabbat Mincha: Tzidkatcha and El Malei Rachamim are omitted on Yom Tov
  if (service === 'mincha' && isShabbat) {
    omissions.push('No צדקתך (Yom Tov)');
    omissions.push('No א-ל מלא רחמים (Yom Tov)');
  }

  return { additions: Array.from(additionsSet), omissions };
}
