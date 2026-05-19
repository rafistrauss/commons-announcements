import { JewishCalendar } from 'kosher-zmanim';
import yomtovTimesData from '$lib/yomtov-times.json';

const PARSHA_NAMES = [
  'אין', 'בראשית', 'נח', 'לך לך', 'וירא', 'חיי שרה', 'תולדות', 'ויצא', 'וישלח', 'וישב', 'מקץ', 'ויגש', 'ויחי',
  'שמות', 'וארא', 'בא', 'בשלח', 'יתרו', 'משפטים', 'תרומה', 'תצוה', 'כי תשא', 'ויקהל', 'פקודי', 'ויקרא', 'צו', 'שמני',
  'תזריע', 'מצרע', 'אחרי מות', 'קדושים', 'אמור', 'בהר', 'בחקתי', 'במדבר', 'נשא', 'בהעלתך', 'שלח', 'קרח', 'חקת',
  'בלק', 'פנחס', 'מטות', 'מסעי', 'דברים', 'ואתחנן', 'עקב', 'ראה', 'שפטים', 'כי תצא', 'כי תבוא', 'נצבים', 'וילך', 'האזינו', 'וזאת הברכה',
  'ויקהל-פקודי', 'תזריע-מצרע', 'אחרי מות-קדושים', 'בהר-בחקתי', 'חקת-בלק', 'מטות-מסעי', 'נצבים-וילך',
];

/**
 * Get the weekly parsha name for a given Shabbat.
 * Returns null if not Shabbat or if there is no regular parsha (e.g. Shabbat Yom Tov / Chol HaMoed).
 */
export function getParshaForShabbat(date: Date): string | null {
  if (date.getDay() !== 6) return null;
  const jewishCal = new JewishCalendar(date);
  const parshaNum = jewishCal.getParsha();
  if (parshaNum <= 0 || parshaNum >= PARSHA_NAMES.length) return null;
  return PARSHA_NAMES[parshaNum];
}

/**
 * Get the parsha read at Shabbat Mincha (= the upcoming week's parsha).
 * Returns null if the date is not Shabbat.
 */
export function getMinchaTorahReading(date: Date): string | null {
  if (date.getDay() !== 6) return null;
  const nextShabbat = new Date(date);
  nextShabbat.setDate(date.getDate() + 7);
  return getParshaForShabbat(nextShabbat);
}

/**
 * Get all civil dates for a Yom Tov period (including Erev), finding the nearest
 * upcoming (or currently ongoing) occurrence using the Jewish calendar.
 *
 * @param month   - Jewish month number (1 = Nisan, 3 = Sivan, …)
 * @param erevDay - Jewish day of month for Erev (e.g. 14 for Erev Pesach, 5 for Erev Shavuot)
 * @param lastDay - Jewish day of month for the last day (e.g. 22 for Pesach, 7 for Shavuot)
 */
export function getYomTovDateRange(month: number, erevDay: number, lastDay: number): Date[] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  // Scan back up to 25 days so we catch a holiday that is currently in progress.
  const scan = new Date(today);
  scan.setDate(scan.getDate() - 25);
  scan.setHours(12, 0, 0, 0);

  for (let i = 0; i < 420; i++) {
    const cal = new JewishCalendar(scan);
    if (cal.getJewishMonth() === month && cal.getJewishDayOfMonth() === erevDay) {
      const numDays = lastDay - erevDay + 1;
      return Array.from({ length: numDays }, (_, d) => {
        const date = new Date(scan);
        date.setDate(scan.getDate() + d);
        return date;
      });
    }
    scan.setDate(scan.getDate() + 1);
  }

  return [];
}

type YomTovTimesJson = {
  lastUpdated: string;
  [year: string]: {
    [holidayKey: string]: {
      [dateKey: string]: {
        shacharit?: string;
        mincha?: string;
        maariv?: string;
        mincha_maariv?: string;
        notes?: string;
      };
    };
  } | string;
};

const yomtovTimesDataTyped = yomtovTimesData as YomTovTimesJson;

// Helper function to format a date as YYYY-MM-DD
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get YomTov times for a specific holiday and date
 */
export function getYomTovTimes(
  date: Date,
  holidayKey: string
): {
  shacharit: string | null;
  mincha: string | null;
  maariv: string | null;
  minchaAndMaariv: string | null;
  notes: string | null;
} {
  const dateKey = formatDateKey(date);
  const yearKey = String(date.getFullYear());
  const yearData = yomtovTimesDataTyped[yearKey];
  const holidayData = typeof yearData === 'object' && yearData !== null ? yearData[holidayKey] : undefined;

  if (!holidayData) {
    console.warn(`No YomTov data found for holiday: ${holidayKey}`);
    return { shacharit: null, mincha: null, maariv: null, minchaAndMaariv: null, notes: null };
  }

  const times = holidayData[dateKey];
  if (!times) {
    console.warn(`No YomTov times found for ${holidayKey} on ${dateKey}`);
    return { shacharit: null, mincha: null, maariv: null, minchaAndMaariv: null, notes: null };
  }

  return {
    shacharit: times.shacharit || null,
    mincha: times.mincha || null,
    maariv: times.maariv || null,
    minchaAndMaariv: times.mincha_maariv || null,
    notes: times.notes || null,
  };
}

/**
 * Get liturgical notices specific to YomTov for a service
 * Generic function - can be extended for different holidays
 */
export function getYomTovLiturgicalNotices(
  date: Date,
  service: 'shacharit' | 'mincha' | 'maariv',
  holidayKey: string
): { additions: string[]; omissions: string[] } {
  const jewishCal = new JewishCalendar(date);
  const additionsSet = new Set<string>();
  const omissions: string[] = [];

  // All YomTov services skip Tachanun
  omissions.push('Tachanun (Yom Tov)');

  // Add holiday-specific logic based on holiday type
  // This can be extended for Sukkot, Shavuot, etc.

  return { additions: Array.from(additionsSet), omissions };
}

/**
 * Get YomTov details for a specific date
 * Returns info about what holiday the date falls on (if any)
 */
export function getYomTovDetails(date: Date): {
  isYomTov: boolean;
  holidayKey?: string;
  holidayName?: string;
  dayNumber?: number;
} {
  const jewishCal = new JewishCalendar(date);
  const jewishMonth = jewishCal.getJewishMonth();
  const jewishDay = jewishCal.getJewishDayOfMonth();

  // Pesach: 15-22 Nisan
  if (jewishMonth === 1 && jewishDay >= 15 && jewishDay <= 22) {
    const dayNumber = jewishDay - 14; // Convert to 1-8 day count
    return {
      isYomTov: true,
      holidayKey: 'pesach',
      holidayName: `Pesach - Day ${dayNumber}`,
      dayNumber,
    };
  }

  // Shavuot: 6-7 Sivan
  if (jewishMonth === 3 && (jewishDay === 6 || jewishDay === 7)) {
    return {
      isYomTov: true,
      holidayKey: 'shavuot',
      holidayName: `Shavuot - Day ${jewishDay === 6 ? 1 : 2}`,
      dayNumber: jewishDay === 6 ? 1 : 2,
    };
  }

  // Sukkot: 15-22 Tishrei
  if (jewishMonth === 7 && jewishDay >= 15 && jewishDay <= 22) {
    const dayNumber = jewishDay - 14; // Convert to 1-8 day count
    return {
      isYomTov: true,
      holidayKey: 'sukkot',
      holidayName: `Sukkot - Day ${dayNumber}`,
      dayNumber,
    };
  }

  return { isYomTov: false };
}

/**
 * Get announcements for a YomTov date
 * Announcements are stored by date
 */
export function getYomTovAnnouncements(date: Date, announcementsByDate: Record<string, string[]>): string[] {
  const dateKey = formatDateKey(date);
  return announcementsByDate[dateKey] || [];
}

/**
 * Get the Hebrew name for a YomTov day
 */
export function getYomTovDayHebrewName(holidayKey: string, dayNumber: number): string {
  if (holidayKey === 'pesach') {
    const pesachDayNames = [
      '— יום ט״ו ניסן — ליל הסדר',
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

  if (holidayKey === 'shavuot') {
    return dayNumber === 1 ? 'שבועות - יום ראשון' : 'שבועות - יום שני';
  }

  if (holidayKey === 'sukkot') {
    const sukkotDayNames = [
      'יום ראשון של סוכות',
      'חול המועד סוכות',
      'חול המועד סוכות',
      'חול המועד סוכות',
      'חול המועד סוכות',
      'חול המועד סוכות',
      'הושענא רבה',
      'שמיני עצרת / שמחת תורה',
    ];
    return sukkotDayNames[dayNumber - 1] || 'סוכות';
  }

  return 'יום טוב';
}
