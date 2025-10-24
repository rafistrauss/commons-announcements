import type { PageLoad } from './$types';
import { getZmanimJson, JewishCalendar } from 'kosher-zmanim';
import minyanTimesData from '$lib/minyan-times.json';
type MinyanTimesJson = {
  times: {
    [date: string]: {
      fridayMincha: string;
      shabbatMincha: string;
      shabbatMaariv: string;
    };
  };
};

const minyanTimesDataTyped = minyanTimesData as MinyanTimesJson;

// Function to get minyan times from static JSON file
async function getMinyanTimes(fridayDate: Date): Promise<{
  fridayMincha: string | null;
  shabbatMincha: string | null;
  shabbatMaariv: string | null;
}> {
  // Directly import minyan times data at build time
  const fridayKey = fridayDate.toISOString().slice(0, 10);
  const times = minyanTimesDataTyped.times[fridayKey];
  if (!times) {
    console.warn(`No minyan times found for ${fridayKey}`);
    return { fridayMincha: null, shabbatMincha: null, shabbatMaariv: null };
  }
  return {
    fridayMincha: times.fridayMincha || null,
    shabbatMincha: times.shabbatMincha || null,
    shabbatMaariv: times.shabbatMaariv || null,
  };
}

// --- Helper functions copied from +page.server.ts ---

// Function to get liturgical notices for a specific date and service
function getLiturgicalNotices(date: Date, service: 'mincha' | 'maariv' | 'shacharit'): { additions: string[], omissions: string[] } {
  const jewishCal = new JewishCalendar(date);
  const additions = new Set<string>();
  const omissions = new Set<string>();
  // For Maariv, we need to check the next Jewish day (since Maariv starts the next day)
  let calToCheck = jewishCal;
  if (service === 'maariv') {
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    calToCheck = new JewishCalendar(nextDay);
  }


  if (calToCheck.isRoshChodesh()) additions.add('יעלה ויבא');
  if (calToCheck.isYomTovAssurBemelacha()) additions.add('יעלה ויבא');
  if (calToCheck.isCholHamoed()) additions.add('יעלה ויבא');
  if (calToCheck.isChanukah()) additions.add('על הניסים');
  if (service === 'maariv') {
    const jewishMonth = calToCheck.getJewishMonth();
    const jewishDay = calToCheck.getJewishDayOfMonth();
    if (jewishMonth === 6 || (jewishMonth === 7 && jewishDay <= 21)) additions.add('לדוד');
  }
  // Mashiv Haruach logic (outside Israel: starts 23 Tishrei, Simchat Torah)
  // Show notice for 30 days after status changes
  const mashivStartMonth = 7; // Tishrei
  const mashivStartDay = 23; // Simchat Torah
  const mashivDuration = 30;
  // Calculate current Jewish date
  const currentMonth = calToCheck.getJewishMonth();
  const currentDay = calToCheck.getJewishDayOfMonth();
  const currentYear = calToCheck.getJewishYear();
  // Find the start date for Mashiv Haruach
  let mashivStartDate = new JewishCalendar(currentYear, mashivStartMonth, mashivStartDay);
  // If current date is before Simchat Torah, use previous year
  if (
    currentMonth < mashivStartMonth ||
    (currentMonth === mashivStartMonth && currentDay < mashivStartDay)
  ) {
    mashivStartDate = new JewishCalendar(currentYear - 1, mashivStartMonth, mashivStartDay);
  }
  // Calculate difference in days
  const daysSinceMashivStart = calToCheck.getAbsDate() - mashivStartDate.getAbsDate();
  if (daysSinceMashivStart >= 0 && daysSinceMashivStart < mashivDuration) {
    additions.add('משיב הרוח');
  }
  return { additions: Array.from(additions), omissions: Array.from(omissions) };
}

/**
 * Determine if Tzidkatcha should be said on this date. 
 *
 * @param date 
 * @returns 
 */
function isSpecialDay(date: Date): { isSpecial: boolean; reason?: string } {
  const jewishCal = new JewishCalendar(date);
  const m = jewishCal.getJewishMonth();
  const d = jewishCal.getJewishDayOfMonth();

  // Rosh Chodesh
  if (jewishCal.isRoshChodesh()) return { isSpecial: true, reason: 'Rosh Chodesh' };
  // Erev Rosh Chodesh
  const tomorrow = new Date(date);
  tomorrow.setDate(date.getDate() + 1);
  const tomorrowJewishCal = new JewishCalendar(tomorrow);
  if (tomorrowJewishCal.isRoshChodesh()) return { isSpecial: true, reason: 'Erev Rosh Chodesh' };

  // Erev Rosh Hashana (29 Elul)
  if (m === 6 && d === 29) return { isSpecial: true, reason: 'Erev Rosh Hashana' };
  // Rosh Hashana (1-2 Tishrei)
  if (m === 7 && (d === 1 || d === 2)) return { isSpecial: true, reason: 'Rosh Hashana' };
  // Erev Yom Kippur (9 Tishrei)
  if (m === 7 && d === 9) return { isSpecial: true, reason: 'Erev Yom Kippur' };
  // Yom Kippur (10 Tishrei)
  if (m === 7 && d === 10) return { isSpecial: true, reason: 'Yom Kippur' };
  // Between Yom Kippur and Succos (11-14 Tishrei)
  if (m === 7 && d >= 11 && d <= 14) return { isSpecial: true, reason: 'Between Yom Kippur and Succos' };
  // Succos (15-21 Tishrei)
  if (m === 7 && d >= 15 && d <= 21) return { isSpecial: true, reason: 'Succos' };
  // Shemini Atzeres (22 Tishrei)
  if (m === 7 && d === 22) return { isSpecial: true, reason: 'Shemini Atzeres' };
  // Simchas Torah (23 Tishrei)
  if (m === 7 && d === 23) return { isSpecial: true, reason: 'Simchas Torah' };
  // Isru Chag (24 Tishrei)
  if (m === 7 && d === 24) return { isSpecial: true, reason: 'Isru Chag' };
  // Some do not recite it the rest of the days from Isru Chag until Rosh Chodesh Marcheshvan (25-29 Tishrei)
  if (m === 7 && d >= 25 && d <= 29) return { isSpecial: true, reason: 'Post-Isru Chag (Tishrei)' };
  // Chanukah (25 Kislev-2 or 3 Teves)
  if ((m === 9 && d >= 25) || (m === 10 && d <= 2) || (m === 10 && d === 3 && jewishCal.getDaysInJewishMonth() === 30)) return { isSpecial: true, reason: 'Chanukah' };
  // Tu b’Shevat (15 Shevat)
  if (m === 11 && d === 15) return { isSpecial: true, reason: 'Tu b’Shevat' };
  // Purim Katan (14-15 I Adar)
  if (m === 13 && (d === 14 || d === 15)) return { isSpecial: true, reason: 'Purim Katan' };
  // Purim (14 Adar)
  if ((m === 12 || m === 14) && d === 14) return { isSpecial: true, reason: 'Purim' };
  // Shushan Purim (15 Adar)
  if ((m === 12 || m === 14) && d === 15) return { isSpecial: true, reason: 'Shushan Purim' };
  // The entire month of Nisan
  if (m === 1) return { isSpecial: true, reason: 'Month of Nisan' };
  // Pesach Sheini (14 Iyar)
  if (m === 2 && d === 14) return { isSpecial: true, reason: 'Pesach Sheini' };
  // Lag b'Omer (18 Iyar)
  if (m === 2 && d === 18) return { isSpecial: true, reason: 'Lag b\'Omer' };
  // From Rosh Chodesh Sivan through the day after Shavuos (1-7 Sivan)
  if (m === 3 && d >= 1 && d <= 7) return { isSpecial: true, reason: 'Rosh Chodesh Sivan through Shavuos' };
  // Tisha b'Av (9 Av)
  if (m === 5 && d === 9) return { isSpecial: true, reason: 'Tisha b\'Av' };
  // Tu b’Av (15 Av)
  if (m === 5 && d === 15) return { isSpecial: true, reason: 'Tu b\'Av' };

  // Fallback: kosher-zmanim built-ins
  if (jewishCal.isYomTov()) return { isSpecial: true, reason: 'Yom Tov' };
  if (jewishCal.isChanukah()) return { isSpecial: true, reason: 'Chanukah' };
  return { isSpecial: false };
}

function hasYomTovInUpcomingWeekExcludingNextShabbat(shabbatDate: Date): boolean {
  for (let i = 1; i <= 6; i++) {
    const dayToCheck = new Date(shabbatDate);
    dayToCheck.setDate(shabbatDate.getDate() + i);
    if (dayToCheck.getDay() === 6) break;
    const jewishCal = new JewishCalendar(dayToCheck);
    if (jewishCal.isAssurBemelacha()) return true;
  }
  return false;
}

/**
 * Calculate if Kiddush Levana can/should be said on Motzei Shabbat
 * Returns info about the Kiddush Levana window for this month
 */
function getKiddushLevanaInfo(shabbatDate: Date): {
  canSayTonight: boolean;
  reason?: string;
  isIdealTime?: boolean;
  lastChance?: boolean;
} {
  // Calculate nightfall on Motzei Shabbat (Saturday night)
  // We need to get zmanim for the Shabbat day to get shkia, then calculate tzeis
  const shabbatZmanim = getZmanim(shabbatDate);
  const shkia = shabbatZmanim.shkia;
  
  // Tzeis hakochavim (nightfall) is approximately 50 minutes after shkia
  // This is when Motzei Shabbat begins and when we can say Kiddush Levana
  const motzeiShabbatNightfall = new Date(shkia);
  motzeiShabbatNightfall.setMinutes(shkia.getMinutes() + 50);
  
  const jewishCal = new JewishCalendar(motzeiShabbatNightfall);
  
  // Get the molad for the current Jewish month
  // getMoladAsDate returns a Luxon DateTime object, not a Date
  const moladDateTime = jewishCal.getMoladAsDate();
  const moladDate = new Date(moladDateTime.toMillis());
  
  // Calculate hours since molad
  const timeSinceMolad = motzeiShabbatNightfall.getTime() - moladDate.getTime();
  const hoursSinceMolad = timeSinceMolad / (1000 * 60 * 60);
  
  // Kiddush Levana window: 3 days (72 hours) to 14 days 18 hours (354 hours)
  // Ideal: after 7 days (168 hours)
  const MIN_HOURS = 72;
  const IDEAL_HOURS = 168;
  const MAX_HOURS = 14 * 24 + 18; // 354 hours
  
  // Check if we're in the valid window
  if (hoursSinceMolad < MIN_HOURS) {
    return { canSayTonight: false, reason: 'Too early (before 3 days after molad)' };
  }
  
  if (hoursSinceMolad > MAX_HOURS) {
    return { canSayTonight: false, reason: 'Too late (after 14 days 18 hours)' };
  }
  
  // Check for exceptions where we don't say Kiddush Levana
  
  // Check if it's during the Nine Days (1-9 Av)
  const jewishMonth = jewishCal.getJewishMonth();
  const jewishDay = jewishCal.getJewishDayOfMonth();
  
  if (jewishMonth === 5 && jewishDay <= 9) {
    return { canSayTonight: false, reason: 'During the Nine Days' };
  }
  
  // Check if Motzei Shabbat is the evening of a Jewish festival
  const motzeiShabbatJewishCal = new JewishCalendar(motzeiShabbatNightfall);
  if (motzeiShabbatJewishCal.isYomTov()) {
    // Can say it but only the blessing, not the full text
    return { 
      canSayTonight: true, 
      reason: 'Yom Tov tonight - say blessing only (no Psalms)', 
      isIdealTime: hoursSinceMolad >= IDEAL_HOURS 
    };
  }
  
  // Check if it's during first 10 days of Tishrei (many have this custom)
  if (jewishMonth === 7 && jewishDay <= 10) {
    // Calculate how many days until the end of the window
    const hoursRemaining = MAX_HOURS - hoursSinceMolad;
    const daysRemaining = hoursRemaining / 24;
    
    // If this might be the last chance (less than 3 days remaining), mention it
    if (daysRemaining < 3) {
      return { 
        canSayTonight: true, 
        reason: 'During first 10 days of Tishrei (many wait, but say it if this is your last chance)',
        lastChance: true,
        isIdealTime: hoursSinceMolad >= IDEAL_HOURS
      };
    }
    
    return { 
      canSayTonight: false, 
      reason: 'During first 10 days of Tishrei (many have custom not to say)' 
    };
  }
  
  // Check if we're approaching the end of the window (last 3 days)
  const hoursRemaining = MAX_HOURS - hoursSinceMolad;
  const daysRemaining = hoursRemaining / 24;
  const lastChance = daysRemaining < 3;
  
  // We're in the valid window!
  const isIdeal = hoursSinceMolad >= IDEAL_HOURS;
  
  return { 
    canSayTonight: true, 
    isIdealTime: isIdeal,
    lastChance: lastChance
  };
}

function getHolidayName(date: Date): string | null {
  const jewishCal = new JewishCalendar(date);
  if (!jewishCal.isYomTov()) return null;
  const jewishMonth = jewishCal.getJewishMonth();
  const jewishDay = jewishCal.getJewishDayOfMonth();
  if (jewishMonth === 7 && (jewishDay === 1 || jewishDay === 2)) return 'ראש השנה';
  if (jewishMonth === 7 && jewishDay === 10) return 'יום כפור';
  if (jewishMonth === 7 && jewishDay >= 15 && jewishDay <= 21) {
    if (jewishDay === 15) return 'סוכות - יום ראשון';
    if (jewishDay === 21) return 'הושענא רבה';
    return 'חול המועד סוכות';
  }
  if (jewishMonth === 7 && jewishDay === 22) return 'שמיני עצרת';
  if (jewishMonth === 7 && jewishDay === 23) return 'שמחת תורה';
  if (jewishMonth === 1 && jewishDay >= 15 && jewishDay <= 22) {
    if (jewishDay === 15) return 'פסח - ליל הסדר';
    if (jewishDay === 16) return 'פסח - יום ראשון';
    if (jewishDay >= 17 && jewishDay <= 20) return 'חול המועד פסח';
    if (jewishDay === 21) return 'שביעי של פסח';
    if (jewishDay === 22) return 'אחרון של פסח';
  }
  if (jewishMonth === 3 && jewishDay === 6) return 'שבועות - יום ראשון';
  if (jewishMonth === 3 && jewishDay === 7) return 'שבועות - יום שני';
  return 'יום טוב';
}

function getZmanim(date: Date) {
  const options = {
    date,
    locationName: 'Fair Lawn, NJ',
    latitude: 40.940866,
    longitude: -74.126082,
    timeZoneId: 'America/New_York',
  };
  const zmanim = getZmanimJson(options);
  let shkia;
  const basicZmanim = zmanim.BasicZmanim as any;
  if (basicZmanim && basicZmanim.Sunset) {
    shkia = new Date(basicZmanim.Sunset);
  } else if (basicZmanim && basicZmanim.sunset) {
    shkia = new Date(basicZmanim.sunset);
  } else {
    const sunsetTime = new Date(date);
    sunsetTime.setHours(19, 30, 0, 0);
    shkia = sunsetTime;
  }
  const jewishCal = new JewishCalendar(date);
  const day = jewishCal.getJewishDayOfMonth();
  const jewishMonthNames = [ '', 'ניסן', 'אייר', 'סיון', 'תמוז', 'אב', 'אלול', 'תשרי', 'חשון', 'כסלו', 'טבת', 'שבט', 'אדר', 'אדר ב\'', 'אדר א\'' ];
  const monthNum = jewishCal.getJewishMonth();
  const month = jewishMonthNames[monthNum];
  const year = jewishCal.getJewishYear();
  const hebrewNumerals = ['', 'א\'', 'ב\'', 'ג\'', 'ד\'', 'ה\'', 'ו\'', 'ז\'', 'ח\'', 'ט\'', 'י\'', 'י"א', 'י"ב', 'י"ג', 'י"ד', 'ט"ו', 'ט"ז', 'י"ז', 'י"ח', 'י"ט', 'כ\'', 'כ"א', 'כ"ב', 'כ"ג', 'כ"ד', 'כ"ה', 'כ"ו', 'כ"ז', 'כ"ח', 'כ"ט', 'ל\''];
  const hebrewDay = hebrewNumerals[day] || day.toString();
  const hebrewDate = `${hebrewDay} ${month} ${year}`;
  return { shkia, hebrewDate, isRoshChodesh: jewishCal.isRoshChodesh() };
}

// --- PageLoad function ---

export const load: PageLoad = async ({ url, fetch }) => {
  let weekOffset = 0;
  try {
    weekOffset = parseInt(url.searchParams?.get('week') || '0');
  } catch {
    weekOffset = 0;
  }
  const today = new Date();
  const friday = new Date(today);
  friday.setDate(today.getDate() + ((5 - today.getDay() + 7) % 7) + (weekOffset * 7));
  const shabbat = new Date(friday);
  shabbat.setDate(friday.getDate() + 1);
  const shabbatJewishCal = new JewishCalendar(shabbat);
  const parshaNames = [
    'אין', 'בראשית', 'נח', 'לך לך', 'וירא', 'חיי שרה', 'תולדות', 'ויצא', 'וישלח', 'וישב', 'מקץ', 'ויגש', 'ויחי',
    'שמות', 'וארא', 'בא', 'בשלח', 'יתרו', 'משפטים', 'תרומה', 'תצוה', 'כי תשא', 'ויקהל', 'פקודי', 'ויקרא', 'צו', 'שמני',
    'תזריע', 'מצרע', 'אחרי מות', 'קדושים', 'אמר', 'בהר', 'בחקתי', 'במדבר', 'נשא', 'בהעלתך', 'שלח', 'קרח', 'חקת',
    'בלק', 'פנחס', 'מטות', 'מסעי', 'דברים', 'ואתחנן', 'עקב', 'ראה', 'שפטים', 'כי תצא', 'כי תבוא', 'נצבים', 'וילך', 'האזינו', 'וזאת הברכה'
  ];
  const parshaNum = shabbatJewishCal.getParsha();
  let weeklyParsha = parshaNum >= 0 && parshaNum < parshaNames.length ? parshaNames[parshaNum] : 'לא ידוע';
  const nextShabbat = new Date(shabbat);
  nextShabbat.setDate(shabbat.getDate() + 7);
  const nextShabbatJewishCal = new JewishCalendar(nextShabbat);
  const nextParshaNum = nextShabbatJewishCal.getParsha();
  let nextWeekParsha = nextParshaNum >= 0 && nextParshaNum < parshaNames.length ? parshaNames[nextParshaNum] : 'לא ידוע';
  if (parshaNum === 53 ||
      (shabbatJewishCal.getJewishMonth() === 7 && 
       shabbatJewishCal.getJewishDayOfMonth() >= 15 && 
       shabbatJewishCal.getJewishDayOfMonth() <= 21 && 
       shabbat.getDay() === 6)) {
    nextWeekParsha = 'וזאת הברכה';
  }
  const holidayName = getHolidayName(shabbat);
  if (holidayName) {
    if (parshaNum < 0 || weeklyParsha === 'לא ידוע' || weeklyParsha === 'אין') {
      weeklyParsha = holidayName;
    } else {
      weeklyParsha = `פרשת ${weeklyParsha} - ${holidayName}`;
    }
  } else {
    weeklyParsha = `פרשת ${weeklyParsha}`;
  }
  const fridayZmanim = getZmanim(friday);
  const shabbatZmanim = getZmanim(shabbat);
  const englishDateOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const fridayEnglishDate = friday.toLocaleDateString('en-US', englishDateOptions);
  const shabbatEnglishDate = shabbat.toLocaleDateString('en-US', englishDateOptions);
  const fridayMinchaNotices = getLiturgicalNotices(friday, 'mincha');
  const fridayMaarivNotices = getLiturgicalNotices(friday, 'maariv');
  const shabbatMinchaNotices = getLiturgicalNotices(shabbat, 'mincha');
  const shabbatMaarivNotices = getLiturgicalNotices(shabbat, 'maariv');

  // Check if either Friday or Shabbat is Aseret Yemei Teshuva
  let aseretYemeiTeshuvaActive = false;
  const tishrei = 7;
  const checkAseret = (date: Date) => {
    const cal = new JewishCalendar(date);
    return cal.getJewishMonth() === tishrei && cal.getJewishDayOfMonth() >= 3 && cal.getJewishDayOfMonth() <= 9;
  };
  if (checkAseret(friday) || checkAseret(shabbat)) {
    aseretYemeiTeshuvaActive = true;
  }
  if (hasYomTovInUpcomingWeekExcludingNextShabbat(shabbat)) {
    shabbatMaarivNotices.omissions.push('ויהי נועם (Yom Tov this week)');
  }
  const shabbatTzidkatchaStatus = isSpecialDay(shabbat);

  // Per-Shabbat general announcements
  const generalAnnouncementsByDate: Record<string, string[]> = {
    // Example: '2025-10-11': ['Special guest speaker this Shabbat!', 'Kiddush sponsored by the Strauss family'],
    '2025-10-04': ['Rabbi Markowitz will be speaking between Mincha and Maariv on the topic of Sukkot'],
    // Add more dates and announcements as needed
  };
  // Format shabbat date as YYYY-MM-DD
  const fridayDateKey = friday.toISOString().slice(0, 10);
  const shabbatDateKey = shabbat.toISOString().slice(0, 10);
  const generalAnnouncements = [
    ...(generalAnnouncementsByDate[fridayDateKey] || []),
    ...(generalAnnouncementsByDate[shabbatDateKey] || []),
  ]

  const { fridayMincha, shabbatMincha, shabbatMaariv } = await getMinyanTimes(friday);

  // Check if Kiddush Levana can be said on Motzei Shabbat
  const kiddushLevanaInfo = getKiddushLevanaInfo(shabbat);

  return {
    friday: { 
      ...fridayZmanim, 
      parsha: weeklyParsha,
      englishDate: fridayEnglishDate,
      mincha: fridayMincha || "No data available for this date",
      minchaNotices: fridayMinchaNotices,
      maarivNotices: fridayMaarivNotices
    },
    shabbat: { 
      ...shabbatZmanim, 
      parsha: weeklyParsha,
      englishDate: shabbatEnglishDate,
      mincha: shabbatMincha || "No data available for this date",
      minchaNotices: shabbatMinchaNotices,
      maarivNotices: shabbatMaarivNotices,
      shouldSayTzidkatcha: !shabbatTzidkatchaStatus.isSpecial,
      tzidkatchaReason: shabbatTzidkatchaStatus.reason,
      minchaParsha: nextWeekParsha
    },
    maariv: shabbatMaariv || "No data available for this date",
    weekOffset,
    generalAnnouncements,
    aseretYemeiTeshuvaActive,
    kiddushLevanaInfo,
  };
}
