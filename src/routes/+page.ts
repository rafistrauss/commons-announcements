import type { PageLoad } from './$types';
import { getZmanimJson, JewishCalendar } from 'kosher-zmanim';

// --- Helper functions copied from +page.server.ts ---

// Function to get liturgical notices for a specific date and service
function getLiturgicalNotices(date: Date, service: 'mincha' | 'maariv' | 'shacharit'): { additions: string[], omissions: string[] } {
  const jewishCal = new JewishCalendar(date);
  const additions: string[] = [];
  const omissions: string[] = [];
  // For Maariv, we need to check the next Jewish day (since Maariv starts the next day)
  let calToCheck = jewishCal;
  if (service === 'maariv') {
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    calToCheck = new JewishCalendar(nextDay);
  }
  if (calToCheck.isRoshChodesh()) additions.push('יעלה ויבא');
  if (calToCheck.isYomTov()) additions.push('יעלה ויבא');
  if (calToCheck.isChanukah()) additions.push('על הניסים');
  if (service === 'maariv') {
    const jewishMonth = calToCheck.getJewishMonth();
    const jewishDay = calToCheck.getJewishDayOfMonth();
    if (jewishMonth === 6 || (jewishMonth === 7 && jewishDay <= 21)) additions.push('לדוד');
  }
  return { additions, omissions };
}

function isSpecialDay(date: Date): { isSpecial: boolean; reason?: string } {
  const jewishCal = new JewishCalendar(date);
  if (jewishCal.isRoshChodesh()) return { isSpecial: true, reason: 'Rosh Chodesh' };
  const tomorrow = new Date(date);
  tomorrow.setDate(date.getDate() + 1);
  const tomorrowJewishCal = new JewishCalendar(tomorrow);
  if (tomorrowJewishCal.isRoshChodesh()) return { isSpecial: true, reason: 'Erev Rosh Chodesh' };
  if (jewishCal.isYomTov()) return { isSpecial: true, reason: 'Yom Tov' };
  if (jewishCal.isChanukah()) return { isSpecial: true, reason: 'Chanukah' };
  if (jewishCal.getJewishMonth() === 1) return { isSpecial: true, reason: 'Month of Nissan' };
  if (jewishCal.getJewishMonth() === 2 && jewishCal.getJewishDayOfMonth() === 18) return { isSpecial: true, reason: "Lag B'Omer" };
  if (jewishCal.getJewishMonth() === 5 && jewishCal.getJewishDayOfMonth() === 15) return { isSpecial: true, reason: "Tu B'Av" };
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

export const load: PageLoad = async ({ url }) => {
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
  if (hasYomTovInUpcomingWeekExcludingNextShabbat(shabbat)) {
    shabbatMaarivNotices.omissions.push('ויהי נועם (Yom Tov this week)');
  }
  const shabbatTzidkatchaStatus = isSpecialDay(shabbat);
  const generalAnnouncements: string[] = [];
  return {
    friday: { 
      ...fridayZmanim, 
      parsha: weeklyParsha,
      englishDate: fridayEnglishDate,
      mincha: '6:44 PM',
      minchaNotices: fridayMinchaNotices,
      maarivNotices: fridayMaarivNotices
    },
    shabbat: { 
      ...shabbatZmanim, 
      parsha: weeklyParsha,
      englishDate: shabbatEnglishDate,
      mincha: '6:30 PM',
      minchaNotices: shabbatMinchaNotices,
      maarivNotices: shabbatMaarivNotices,
      shouldSayTzidkatcha: !shabbatTzidkatchaStatus.isSpecial,
      tzidkatchaReason: shabbatTzidkatchaStatus.reason,
      minchaParsha: nextWeekParsha
    },
    maariv: '7:40 PM',
    weekOffset,
    generalAnnouncements,
  };
}
