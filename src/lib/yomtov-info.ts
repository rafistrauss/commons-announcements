import { JewishCalendar } from 'kosher-zmanim';
import yomtovTimesData from '$lib/yomtov-times.json';

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
} {
  const dateKey = formatDateKey(date);
  const yearKey = String(date.getFullYear());
  const yearData = yomtovTimesDataTyped[yearKey];
  const holidayData = typeof yearData === 'object' && yearData !== null ? yearData[holidayKey] : undefined;

  if (!holidayData) {
    console.warn(`No YomTov data found for holiday: ${holidayKey}`);
    return { shacharit: null, mincha: null, maariv: null, minchaAndMaariv: null };
  }

  const times = holidayData[dateKey];
  if (!times) {
    console.warn(`No YomTov times found for ${holidayKey} on ${dateKey}`);
    return { shacharit: null, mincha: null, maariv: null, minchaAndMaariv: null };
  }

  return {
    shacharit: times.shacharit || null,
    mincha: times.mincha || null,
    maariv: times.maariv || null,
    minchaAndMaariv: times.mincha_maariv || null,
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
