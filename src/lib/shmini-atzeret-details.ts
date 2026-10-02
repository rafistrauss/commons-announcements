import { JewishCalendar } from 'kosher-zmanim';

/**
 * Check if a date falls during Shmini Atzeret / Simchat Torah
 * Shmini Atzeret is 22 Tishrei, Simchat Torah is 23 Tishrei (2 days in diaspora)
 */
export function isShminiAtzeretDay(date: Date): boolean {
  const jewishCal = new JewishCalendar(date);
  const jewishMonth = jewishCal.getJewishMonth();
  const jewishDay = jewishCal.getJewishDayOfMonth();

  // Shmini Atzeret / Simchat Torah: 22-23 Tishrei (month 7)
  return jewishMonth === 7 && (jewishDay === 22 || jewishDay === 23);
}

/**
 * Get the day number of Shmini Atzeret / Simchat Torah (1 or 2)
 * Returns null if not a Shmini Atzeret / Simchat Torah day
 */
export function getShminiAtzeretDayNumber(date: Date): number | null {
  const jewishCal = new JewishCalendar(date);
  const jewishMonth = jewishCal.getJewishMonth();
  const jewishDay = jewishCal.getJewishDayOfMonth();

  if (jewishMonth !== 7) return null;
  if (jewishDay === 22) return 1;
  if (jewishDay === 23) return 2;
  return null;
}

/**
 * Get Shmini Atzeret / Simchat Torah Hebrew day name
 */
export function getShminiAtzeretDayName(dayNumber: number): string {
  const names = [
    'שמיני עצרת',
    'שמחת תורה',
  ];
  return names[dayNumber - 1] || 'שמיני עצרת / שמחת תורה';
}

/**
 * Get Shmini Atzeret / Simchat Torah-specific liturgical notices for a service
 */
export function getShminiAtzeretLiturgicalNotices(
  date: Date,
  service: 'shacharit' | 'mincha' | 'maariv'
): { additions: string[]; omissions: string[] } {
  const dayNumber = getShminiAtzeretDayNumber(date);
  if (!dayNumber) return { additions: [], omissions: [] };

  const additions: string[] = [];
  const omissions: string[] = [];
  const isShabbat = date.getDay() === 6;

  // יעלה ויבא in all Yom Tov Amidot — but NOT at Maariv on the last night (Motzei Yom Tov)
  if (!(service === 'maariv' && dayNumber === 2)) {
    additions.push('יעלה ויבא');
  }

  // Tefillat Geshem is inserted at Musaf of Shmini Atzeret, and from then on
  // "משיב הרוח ומוריד הגשם" replaces "מוריד הטל" in every subsequent Amidah.
  // Since this sheet has no Musaf slot, the change first shows at Mincha of Day 1.
  if (!(dayNumber === 1 && service === 'shacharit')) {
    additions.push('משיב הרוח ומוריד הגשם');
  }

  if (service === 'shacharit') {
    additions.push('הלל שלם');
    if (dayNumber === 1) {
      additions.push('יזכור');
    }
    if (dayNumber === 2) {
      additions.push('הקפות');
      additions.push('קריאת התורה: וזאת הברכה וחתן בראשית');
    }
  }

  // Hakafot for Simchat Torah begin at Maariv on the night dayNumber transitions to 2
  if (service === 'maariv' && dayNumber === 1) {
    additions.push('הקפות (ליל שמחת תורה)');
  }

  // On Shabbat Mincha: Tzidkatcha and El Malei Rachamim are omitted on Yom Tov
  if (service === 'mincha' && isShabbat) {
    omissions.push('No צדקתך (Yom Tov)');
    omissions.push('No א-ל מלא רחמים (Yom Tov)');
  }

  return { additions, omissions };
}
