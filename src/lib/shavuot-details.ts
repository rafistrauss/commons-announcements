import { JewishCalendar } from 'kosher-zmanim';

/**
 * Check if a date falls during Shavuot
 * Shavuot is 6-7 Sivan (2 days in diaspora)
 */
export function isShavuotDay(date: Date): boolean {
  const jewishCal = new JewishCalendar(date);
  const jewishMonth = jewishCal.getJewishMonth();
  const jewishDay = jewishCal.getJewishDayOfMonth();

  // Shavuot: 6-7 Sivan (month 3)
  return jewishMonth === 3 && (jewishDay === 6 || jewishDay === 7);
}

/**
 * Get the day number of Shavuot (1 or 2)
 * Returns null if not a Shavuot day
 */
export function getShavuotDayNumber(date: Date): number | null {
  const jewishCal = new JewishCalendar(date);
  const jewishMonth = jewishCal.getJewishMonth();
  const jewishDay = jewishCal.getJewishDayOfMonth();

  if (jewishMonth !== 3) return null;
  if (jewishDay === 6) return 1;
  if (jewishDay === 7) return 2;
  return null;
}

/**
 * Get Shavuot Hebrew day name
 */
export function getShavuotDayName(dayNumber: number): string {
  const names = [
    'יום ראשון של שבועות',
    'יום שני של שבועות',
  ];
  return names[dayNumber - 1] || 'שבועות';
}

/**
 * Get Shavuot-specific liturgical notices for a service
 */
export function getShavuotLiturgicalNotices(
  date: Date,
  service: 'shacharit' | 'mincha' | 'maariv'
): { additions: string[]; omissions: string[] } {
  const dayNumber = getShavuotDayNumber(date);
  if (!dayNumber) return { additions: [], omissions: [] };

  const additions: string[] = [];
  const omissions: string[] = [];
  const isShabbat = date.getDay() === 6;

  // יעלה ויבא in all Yom Tov Amidot
  additions.push('יעלה ויבא');

  if (service === 'shacharit') {
    additions.push('הלל שלם');
    if (dayNumber === 1) {
      additions.push('אקדמות (before Torah reading)');
      additions.push('מגילת רות');
    }
    if (dayNumber === 2) {
      additions.push('יזכור');
    }
  }

  // On Shabbat Mincha: Tzidkatcha and El Malei Rachamim are omitted on Yom Tov
  if (service === 'mincha' && isShabbat) {
    omissions.push('No צדקתך (Yom Tov)');
    omissions.push('No א-ל מלא רחמים (Yom Tov)');
  }

  return { additions, omissions };
}
