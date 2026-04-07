import { JewishCalendar } from 'kosher-zmanim';

/**
 * Check if a date falls during Pesach
 * Pesach is 15-22 Nisan (8 days in diaspora)
 */
export function isPesachDay(date: Date): boolean {
  const jewishCal = new JewishCalendar(date);
  const jewishMonth = jewishCal.getJewishMonth();
  const jewishDay = jewishCal.getJewishDayOfMonth();

  // Pesach: 15-22 Nisan (diaspora)
  return jewishMonth === 1 && jewishDay >= 15 && jewishDay <= 22;
}

/**
 * Get the day number of Pesach (1-8)
 * Returns null if not a Pesach day
 */
export function getPesachDayNumber(date: Date): number | null {
  if (!isPesachDay(date)) return null;

  const jewishCal = new JewishCalendar(date);
  const jewishDay = jewishCal.getJewishDayOfMonth();

  // Convert 15-22 Nisan to 1-8 day count
  return jewishDay - 14;
}

/**
 * Get Pesach-specific Hebrew day name
 */
export function getPesachDayName(dayNumber: number): string {
  const pesachDayNames = [
    '— יום ט״ו ניסן — ליל הסדר', // Should not appear in normal views
    'יום ראשון של פסח',
    'יום שני של פסח',
    'חול המועד פסח',
    'חול המועד פסח',
    'חול המועד פסח',
    'שביעי של פסח',
    'אחרון של פסח',
  ];
  return pesachDayNames[dayNumber - 1] || 'פסח';
}

/**
 * Get Pesach-specific liturgical notices for a service
 */
export function getPesachLiturgicalNotices(
  date: Date,
  service: 'shacharit' | 'mincha' | 'maariv'
): { additions: string[]; omissions: string[] } {
  const dayNumber = getPesachDayNumber(date);
  if (!dayNumber) return { additions: [], omissions: [] };

  const additionsSet = new Set<string>();
  const omissions: string[] = [];

  // Pesach-specific additions/omissions

  // Hallel status:
  // Full Hallel: 1st day (16 Nisan for 2nd day in diaspora, or 21 Nisan for 7th day outside Israel)
  // Half Hallel: intermediate days (2-6)
  // Full Hallel: last day (22 Nisan = 8th day diaspora)

  if (service === 'shacharit') {
    if (dayNumber === 1 || dayNumber === 8) {
      additionsSet.add('Full Hallel (Pesukei Dezimra)');
    } else if (dayNumber >= 2 && dayNumber <= 7) {
      additionsSet.add('Half Hallel (Pesukei Dezimra)');
    }
  }

  // Yizkor is said on the 7th day of Pesach (21 Nisan)
  if (dayNumber === 7 && service === 'shacharit') {
    additionsSet.add('Yizkor recited');
  }

  // For 7th day (Shvi'i Shel Pesach) there may be special insertions
  if (dayNumber === 7 && service === 'shacharit') {
    additionsSet.add('Shvi\'i Shel Pesach special prayers');
  }

  return { additions: Array.from(additionsSet), omissions };
}

/**
 * Check if this is the first day of Pesach
 */
export function isFirstDayPesach(date: Date): boolean {
  const dayNumber = getPesachDayNumber(date);
  return dayNumber === 1;
}

/**
 * Check if this is the last day of Pesach (8th day for diaspora)
 */
export function isLastDayPesach(date: Date): boolean {
  const dayNumber = getPesachDayNumber(date);
  return dayNumber === 8;
}

/**
 * Check if this is the 7th day of Pesach (Shvi'i Shel Pesach)
 */
export function isSheviShelpesach(date: Date): boolean {
  const dayNumber = getPesachDayNumber(date);
  return dayNumber === 7;
}

/**
 * Get the next Pesach date if given a date
 * Returns null if already in Pesach
 */
export function getNextPesachStartDate(currentDate: Date): Date | null {
  const cal = new JewishCalendar(currentDate);
  const jewishMonth = cal.getJewishMonth();
  const jewishDay = cal.getJewishDayOfMonth();

  let targetYear = cal.getJewishYear();

  // If before Pesach (month < 1 or month = 1 and day < 15), Pesach is this year
  if (jewishMonth < 1 || (jewishMonth === 1 && jewishDay < 15)) {
    // This year's Pesach
  } else {
    // Pesach is next year
    targetYear++;
  }

  // Return 15 Nisan of the target year
  const pesachCal = new JewishCalendar();
  pesachCal.setJewishDate(targetYear, 1, 15); // Nisan = 1, day 15

  return pesachCal.getDate();
}

/**
 * Check if we're in the middle of Pesach (Chol HaMoed)
 * Days 3-6 (17-20 Nisan) in diaspora
 */
export function isCholHaModPesach(date: Date): boolean {
  const dayNumber = getPesachDayNumber(date);
  return dayNumber !== null && dayNumber >= 3 && dayNumber <= 6;
}
