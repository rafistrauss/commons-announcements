
import kosherZmanimPkg from 'kosher-zmanim';
const { getZmanimJson } = kosherZmanimPkg;
import { JewishCalendar } from 'kosher-zmanim';

// Function to get liturgical notices for a specific date and service
function getLiturgicalNotices(date: Date, service: 'mincha' | 'maariv' | 'shacharit'): string[] {
  const jewishCal = new JewishCalendar(date);
  const notices: string[] = [];
  
  // For Maariv, we need to check the next Jewish day (since Maariv starts the next day)
  let calToCheck = jewishCal;
  if (service === 'maariv') {
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    calToCheck = new JewishCalendar(nextDay);
  }
  
  // Check for Rosh Chodesh
  if (calToCheck.isRoshChodesh()) {
    notices.push('יעלה ויבא (Ya\'ale V\'yavo)');
  }
  
  // Check for Yom Tov
  if (calToCheck.isYomTov()) {
    notices.push('יעלה ויבא (Ya\'ale V\'yavo)');
  }
  
  // Check for Chanukah
  if (calToCheck.isChanukah()) {
    notices.push('על הניסים (Al HaNissim)');
  }
  
  // Check for L'david season (1 Elul through Hoshanah Rabbah - 21 Tishrei)
  // For Nusach Ashkenaz, L'david is said at Maariv, not Mincha
  if (service === 'maariv') {
    const jewishMonth = calToCheck.getJewishMonth();
    const jewishDay = calToCheck.getJewishDayOfMonth();
    
    // Elul is month 6, Tishrei is month 7
    if (jewishMonth === 6 || // All of Elul
        (jewishMonth === 7 && jewishDay <= 21)) { // Tishrei through Hoshanah Rabbah (21st)
      notices.push('לדוד');
    }
  }

  
  // Check for fast days (if it's a weekday)
  const dayOfWeek = date.getDay();
  if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Shabbat
    // Add logic for fast days if needed
  }
  
  return notices;
}

// Function to check if it's a special day when Tachanun (and thus Tzidkatcha) is omitted
function isSpecialDay(date: Date): { isSpecial: boolean; reason?: string } {
  const jewishCal = new JewishCalendar(date);
  
  // Check for Rosh Chodesh
  if (jewishCal.isRoshChodesh()) {
    return { isSpecial: true, reason: 'Rosh Chodesh' };
  }
  
  // Check for Erev Rosh Chodesh (day before Rosh Chodesh)
  const tomorrow = new Date(date);
  tomorrow.setDate(date.getDate() + 1);
  const tomorrowJewishCal = new JewishCalendar(tomorrow);
  if (tomorrowJewishCal.isRoshChodesh()) {
    return { isSpecial: true, reason: 'Erev Rosh Chodesh' };
  }
  
  // Check for major holidays (when Tachanun is omitted)
  if (jewishCal.isYomTov()) {
    return { isSpecial: true, reason: 'Yom Tov' };
  }
  
  // Check for Chanukah
  if (jewishCal.isChanukah()) {
    return { isSpecial: true, reason: 'Chanukah' };
  }
  
  // Check for month of Nissan
  if (jewishCal.getJewishMonth() === 1) {
    return { isSpecial: true, reason: 'Month of Nissan' };
  }
  
  // Check for Lag B'Omer (18 Iyar)
  if (jewishCal.getJewishMonth() === 2 && jewishCal.getJewishDayOfMonth() === 18) {
    return { isSpecial: true, reason: 'Lag B\'Omer' };
  }
  
  // Check for 15 Av (Tu B'Av)
  if (jewishCal.getJewishMonth() === 5 && jewishCal.getJewishDayOfMonth() === 15) {
    return { isSpecial: true, reason: 'Tu B\'Av' };
  }
  
  return { isSpecial: false };
}

// Function to get the holiday name if it's a Yom Tov
function getHolidayName(date: Date): string | null {
  const jewishCal = new JewishCalendar(date);
  
  if (!jewishCal.isYomTov()) return null;
  
  const jewishMonth = jewishCal.getJewishMonth();
  const jewishDay = jewishCal.getJewishDayOfMonth();
  
  // Rosh Hashana
  if (jewishMonth === 7 && (jewishDay === 1 || jewishDay === 2)) {
    return 'ראש השנה';
  }
  
  // Yom Kippur
  if (jewishMonth === 7 && jewishDay === 10) {
    return 'יום כפור';
  }
  
  // Sukkot
  if (jewishMonth === 7 && jewishDay >= 15 && jewishDay <= 21) {
    if (jewishDay === 15) return 'סוכות - יום ראשון';
    if (jewishDay === 21) return 'הושענא רבה';
    return 'חול המועד סוכות';
  }
  
  // Shemini Atzeret / Simchat Torah
  if (jewishMonth === 7 && jewishDay === 22) {
    return 'שמיני עצרת';
  }
  if (jewishMonth === 7 && jewishDay === 23) {
    return 'שמחת תורה';
  }
  
  // Pesach
  if (jewishMonth === 1 && jewishDay >= 15 && jewishDay <= 22) {
    if (jewishDay === 15) return 'פסח - ליל הסדר';
    if (jewishDay === 16) return 'פסח - יום ראשון';
    if (jewishDay >= 17 && jewishDay <= 20) return 'חול המועד פסח';
    if (jewishDay === 21) return 'שביעי של פסח';
    if (jewishDay === 22) return 'אחרון של פסח';
  }
  
  // Shavuot
  if (jewishMonth === 3 && jewishDay === 6) {
    return 'שבועות - יום ראשון';
  }
  if (jewishMonth === 3 && jewishDay === 7) {
    return 'שבועות - יום שני';
  }
  
  return 'יום טוב';
}




function getZmanim(date: Date) {
  // Fair Lawn, NJ coordinates and timezone
  const options = {
    date,
    locationName: 'Fair Lawn, NJ',
    latitude: 40.9402,
    longitude: -74.1165,
    timeZoneId: 'America/New_York',
  };
  const zmanim = getZmanimJson(options);
  
  // // Debug: log zmanim keys to understand the output structure
  // console.log('Zmanim keys:', Object.keys(zmanim));
  // console.log('BasicZmanim structure:', zmanim.BasicZmanim);
  // console.log('All BasicZmanim keys:', zmanim.BasicZmanim ? Object.keys(zmanim.BasicZmanim) : 'BasicZmanim is undefined');

  // Jewish calendar for parsha, Hebrew date, Rosh Chodesh
  const jewishCal = new JewishCalendar(date);
  
  // Parse shkia from zmanim output - access BasicZmanim.Sunset
  let shkia;
  const basicZmanim = zmanim.BasicZmanim as any;
  if (basicZmanim && basicZmanim.Sunset) {
    shkia = new Date(basicZmanim.Sunset);
  } else if (basicZmanim && basicZmanim.sunset) {
    shkia = new Date(basicZmanim.sunset);
  } else {
    // Fallback: calculate sunset manually using basic formula
    const sunsetTime = new Date(date);
    sunsetTime.setHours(19, 30, 0, 0); // Default approximate sunset time
    shkia = sunsetTime;
  }

  // Build Hebrew date string
  const day = jewishCal.getJewishDayOfMonth();
  // JewishCalendar does not have getJewishMonthName, so use getJewishMonth and map to name
  const jewishMonthNames = [
    '', // No month 0
    'ניסן', 'אייר', 'סיון', 'תמוז', 'אב', 'אלול',
    'תשרי', 'חשון', 'כסלו', 'טבת', 'שבט', 'אדר', 'אדר ב\'', 'אדר א\''
  ];
  const monthNum = jewishCal.getJewishMonth();
  const month = jewishMonthNames[monthNum];
  const year = jewishCal.getJewishYear();

  // Convert day to Hebrew numerals
  const hebrewNumerals = ['', 'א\'', 'ב\'', 'ג\'', 'ד\'', 'ה\'', 'ו\'', 'ז\'', 'ח\'', 'ט\'', 'י\'', 
    'י"א', 'י"ב', 'י"ג', 'י"ד', 'ט"ו', 'ט"ז', 'י"ז', 'י"ח', 'י"ט', 'כ\'', 
    'כ"א', 'כ"ב', 'כ"ג', 'כ"ד', 'כ"ה', 'כ"ו', 'כ"ז', 'כ"ח', 'כ"ט', 'ל\''];
  const hebrewDay = hebrewNumerals[day] || day.toString();
  
  const hebrewDate = `${hebrewDay} ${month} ${year}`;

  return {
    shkia,
    hebrewDate,
    isRoshChodesh: jewishCal.isRoshChodesh(),
  };
}

export async function load({ url }) {
  // Get the week offset from URL parameter (default to 0 for current week)
  // Handle prerendering case where searchParams might not be available
  let weekOffset = 0;
  try {
    weekOffset = parseInt(url.searchParams?.get('week') || '0');
  } catch {
    // If searchParams is not available (e.g., during prerendering), use default
    weekOffset = 0;
  }
  
  // Get Friday and Shabbat dates for the specified week
  const today = new Date();
  const friday = new Date(today);
  friday.setDate(today.getDate() + ((5 - today.getDay() + 7) % 7) + (weekOffset * 7));
  const shabbat = new Date(friday);
  shabbat.setDate(friday.getDate() + 1);

  // Get the weekly parsha from Saturday
  const shabbatJewishCal = new JewishCalendar(shabbat);
  const parshaNames = [
    'אין', 'בראשית', 'נח', 'לך לך', 'וירא', 'חיי שרה', 'תולדות', 'ויצא', 'וישלח', 'וישב', 'מקץ', 'ויגש', 'ויחי',
    'שמות', 'וארא', 'בא', 'בשלח', 'יתרו', 'משפטים', 'תרומה', 'תצוה', 'כי תשא', 'ויקהל', 'פקודי', 'ויקרא', 'צו', 'שמני',
    'תזריע', 'מצרע', 'אחרי מות', 'קדושים', 'אמר', 'בהר', 'בחקתי', 'במדבר', 'נשא', 'בהעלתך', 'שלח', 'קרח', 'חקת',
    'בלק', 'פנחס', 'מטות', 'מסעי', 'דברים', 'ואתחנן', 'עקב', 'ראה', 'שפטים', 'כי תצא', 'כי תבוא', 'נצבים', 'וילך', 'האזינו', 'וזאת הברכה'
  ];
  const parshaNum = shabbatJewishCal.getParsha();
  let weeklyParsha = parshaNum >= 0 && parshaNum < parshaNames.length ? parshaNames[parshaNum] : 'לא ידוע';
  
  // Calculate next week's parsha for Mincha reading
  const nextShabbat = new Date(shabbat);
  nextShabbat.setDate(shabbat.getDate() + 7);
  const nextShabbatJewishCal = new JewishCalendar(nextShabbat);
  const nextParshaNum = nextShabbatJewishCal.getParsha();
  let nextWeekParsha = nextParshaNum >= 0 && nextParshaNum < parshaNames.length ? parshaNames[nextParshaNum] : 'לא ידוע';
  
  // Special cases for V'zos Habracha at Mincha
  // On Shabbat Haazinu (parsha 53) and Shabbat Chol Hamoed Sukkot, we read V'zos Habracha
  if (parshaNum === 53 || // Shabbat Haazinu
      (shabbatJewishCal.getJewishMonth() === 7 && 
       shabbatJewishCal.getJewishDayOfMonth() >= 15 && 
       shabbatJewishCal.getJewishDayOfMonth() <= 21 && 
       shabbat.getDay() === 6)) { // Shabbat during Sukkot (15-21 Tishrei)
    nextWeekParsha = 'וזאת הברכה';
  }
  
  // Check if it's a holiday and modify the parsha display
  const holidayName = getHolidayName(shabbat);
  if (holidayName) {
    // If there's no parsha (parshaNum < 0), it's unknown, or it's "אין" (none), show just the holiday
    if (parshaNum < 0 || weeklyParsha === 'לא ידוע' || weeklyParsha === 'אין') {
      weeklyParsha = holidayName;
    } else {
      weeklyParsha = `פרשת ${weeklyParsha} - ${holidayName}`;
    }
  } else {
    // Add "פרשת" prefix for regular parsha
    weeklyParsha = `פרשת ${weeklyParsha}`;
  }

  const fridayZmanim = getZmanim(friday);
  const shabbatZmanim = getZmanim(shabbat);

  // Add English dates
  const englishDateOptions: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  const fridayEnglishDate = friday.toLocaleDateString('en-US', englishDateOptions);
  const shabbatEnglishDate = shabbat.toLocaleDateString('en-US', englishDateOptions);

  // Get liturgical notices
  const fridayMinchaNotices = getLiturgicalNotices(friday, 'mincha');
  const fridayMaarivNotices = getLiturgicalNotices(friday, 'maariv');
  const shabbatMinchaNotices = getLiturgicalNotices(shabbat, 'mincha');
  const shabbatMaarivNotices = getLiturgicalNotices(shabbat, 'maariv');

  // Check Tzidkatcha only for Shabbat Mincha service (not Friday)
  const shabbatTzidkatchaStatus = isSpecialDay(shabbat);

  // General announcements for this week
  const generalAnnouncements = [
    'Welcome to Ora Friedman who is visiting the Commons for Shabbos! She already lives in Fair Lawn but is checking out the Commons to potentially join us.',
    'Seudah Shlishit at the Clubhouse at 4:45 PM; see the flyer for details.',
    'Rabbi Katz will be giving a shiur after Shabbos Mincha at the Lefkowitz home. The topic will be Check it out! Inspecting Tefillin, Mezuzos, and Ourselves in Elul',
  ];

  return {
    friday: { 
      ...fridayZmanim, 
      parsha: weeklyParsha,
      englishDate: fridayEnglishDate,
      mincha: '7:07 PM',
      minchaNotices: fridayMinchaNotices,
      maarivNotices: fridayMaarivNotices
    },
    shabbat: { 
      ...shabbatZmanim, 
      parsha: weeklyParsha,
      englishDate: shabbatEnglishDate,
      mincha: '6:55 PM',
      minchaNotices: shabbatMinchaNotices,
      maarivNotices: shabbatMaarivNotices,
      shouldSayTzidkatcha: !shabbatTzidkatchaStatus.isSpecial,
      tzidkatchaReason: shabbatTzidkatchaStatus.reason,
      minchaParsha: nextWeekParsha
    },
    maariv: '8:00 PM',
    weekOffset,
    generalAnnouncements,
  };
}
