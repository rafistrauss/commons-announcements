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

// Function to get minyan times from JSON data
function getMinyanTimes(fridayDate: Date): {
  fridayMincha: string | null;
  shabbatMincha: string | null;
  shabbatMaariv: string | null;
} {
  // Use local date components to avoid timezone issues with toISOString()
  const year = fridayDate.getFullYear();
  const month = String(fridayDate.getMonth() + 1).padStart(2, '0');
  const day = String(fridayDate.getDate()).padStart(2, '0');
  const fridayKey = `${year}-${month}-${day}`;
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

  // --- Aseret Yemei Teshuva insertions (3–9 Tishrei) ---
  // 3–9 Tishrei: highlight Hamelech Hakadosh, mention other insertions
  const tishrei = 7;
  const day = calToCheck.getJewishDayOfMonth();
  const month = calToCheck.getJewishMonth();
  if (month === tishrei && day >= 3 && day <= 9) {
    additions.push('המלך הקדוש (Aseret Yemei Teshuva)');
    additions.push('Other Aseret Yemei Teshuva insertions: זכרנו לחיים, מי כמוך, וכתוב לחיים, בספר חיים');
  }
  
  // Check for Rosh Chodesh
  if (calToCheck.isRoshChodesh()) {
    additions.push('יעלה ויבא');
  }
  
  // Check for Yom Tov
  if (calToCheck.isYomTov()) {
    additions.push('יעלה ויבא');
  }
  
  // Check for Chanukah
  if (calToCheck.isChanukah()) {
    additions.push('על הניסים');
  }
  
  // Check for L'david season (1 Elul through Hoshanah Rabbah - 21 Tishrei)
  // For Nusach Ashkenaz, L'david is said at Maariv, not Mincha
  if (service === 'maariv') {
    const jewishMonth = calToCheck.getJewishMonth();
    const jewishDay = calToCheck.getJewishDayOfMonth();
    
    // Elul is month 6, Tishrei is month 7
    if (jewishMonth === 6 || // All of Elul
        (jewishMonth === 7 && jewishDay <= 21)) { // Tishrei through Hoshanah Rabbah (21st)
      additions.push('לדוד');
    }
  }

  
  // Check for fast days (if it's a weekday)
  const dayOfWeek = date.getDay();
  if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Shabbat
    // Add logic for fast days if needed
  }
  
  return { additions, omissions };
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

// Function to check if there's a Yom Tov in the upcoming week (excluding next Shabbat)
function hasYomTovInUpcomingWeekExcludingNextShabbat(shabbatDate: Date): boolean {
  // Check each day from Sunday to Friday of the upcoming week (not including next Shabbat)
  for (let i = 1; i <= 6; i++) {
    const dayToCheck = new Date(shabbatDate);
    dayToCheck.setDate(shabbatDate.getDate() + i);
    // Only check up to Friday
    if (dayToCheck.getDay() === 6) break;
    const jewishCal = new JewishCalendar(dayToCheck);
    if (jewishCal.isAssurBemelacha()) {
      return true;
    }
  }
  return false;
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
    latitude: 40.940866,
    longitude: -74.126082,
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
    weekOffset = parseInt(url.searchParams?.get('week') || '0', 10);
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
  
  // Check for Yom Tov in upcoming week (excluding next Shabbat) and add Veyhi Noam notice if needed
  if (hasYomTovInUpcomingWeekExcludingNextShabbat(shabbat)) {
    shabbatMaarivNotices.omissions.push('ויהי נועם (Yom Tov this week)');
  }

  // Check Tzidkatcha only for Shabbat Mincha service (not Friday)
  const shabbatTzidkatchaStatus = isSpecialDay(shabbat);

  // Get minyan times from JSON
  const { fridayMincha, shabbatMincha, shabbatMaariv } = getMinyanTimes(friday);

  /**
   * Calculate if Kiddush Levana can/should be said on Motzei Shabbat
   * Returns info about the Kiddush Levana window for this month
   */
  function getKiddushLevanaInfo(shabbatDate: Date): {
    canSayTonight: boolean;
    reason?: string;
    isIdealTime?: boolean;
    lastChance?: boolean;
    lastMotzeiShabbos?: boolean;
    lastTimeToSay?: Date;
  } {
    // Calculate nightfall on Motzei Shabbat (Saturday night)
    // We need to get zmanim for the Shabbat day to get shkia, then calculate tzeis
    const shabbatZmanim = getZmanim(shabbat);
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

    const lastTimeToSay = new Date(moladDate.getTime() + MAX_HOURS * 60 * 60 * 1000);
    
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
        isIdealTime: hoursSinceMolad >= IDEAL_HOURS,
        lastTimeToSay: lastTimeToSay
      };
    }
    
    // Check if it's during first 10 days of Tishrei (many have this custom)
    if (jewishMonth === 7 && jewishDay <= 10) {
      // Calculate when the next Motzei Shabbos will be (7 days from now)
      const nextMotzeiShabbos = new Date(motzeiShabbatNightfall);
      nextMotzeiShabbos.setDate(nextMotzeiShabbos.getDate() + 7);
      
      // If this is the last Motzei Shabbos before the window closes, mention it
      const isLastMotzeiShabbos = nextMotzeiShabbos.getTime() > lastTimeToSay.getTime();
      
      // Check if tonight is actually the very last night (deadline is before tomorrow night)
      const tomorrowNight = new Date(motzeiShabbatNightfall);
      tomorrowNight.setDate(tomorrowNight.getDate() + 1);
      const isLastNight = tomorrowNight.getTime() > lastTimeToSay.getTime();
      
      if (isLastMotzeiShabbos || isLastNight) {
        return { 
          canSayTonight: true, 
          reason: 'During first 10 days of Tishrei (many wait, but say it if this is your last chance)',
          lastChance: isLastNight,
          lastMotzeiShabbos: isLastMotzeiShabbos && !isLastNight,
          isIdealTime: hoursSinceMolad >= IDEAL_HOURS,
          lastTimeToSay: lastTimeToSay
        };
      }
      
      return { 
        canSayTonight: false, 
        reason: 'During first 10 days of Tishrei (many have custom not to say)' 
      };
    }
    
    // Check if this is the last Motzei Shabbos before the window closes
    // Calculate when the next Motzei Shabbos will be (7 days from now)
    const nextMotzeiShabbos = new Date(motzeiShabbatNightfall);
    nextMotzeiShabbos.setDate(nextMotzeiShabbos.getDate() + 7);
    
    // Check if the next Motzei Shabbos is after the last time to say Kiddush Levana
    const isLastMotzeiShabbos = nextMotzeiShabbos.getTime() > lastTimeToSay.getTime();
    
    // Check if tonight is actually the very last night (deadline is before tomorrow night)
    const tomorrowNight = new Date(motzeiShabbatNightfall);
    tomorrowNight.setDate(tomorrowNight.getDate() + 1);
    const isLastNight = tomorrowNight.getTime() > lastTimeToSay.getTime();
    
    // We're in the valid window!
    const isIdeal = hoursSinceMolad >= IDEAL_HOURS;
    
    return { 
      canSayTonight: true, 
      isIdealTime: isIdeal,
      lastChance: isLastNight,
      lastMotzeiShabbos: isLastMotzeiShabbos && !isLastNight,
      lastTimeToSay: lastTimeToSay
    };
  }
  
  // Check if Kiddush Levana can be said on Motzei Shabbat
  const kiddushLevanaInfo = getKiddushLevanaInfo(shabbat);
  
  // El Maleh Rachamim is omitted on special days (same as Tzidkatcha generally)
  // We'll check if next Shabbat has a special day that would cause omission
  function getElMalehRachamimInfo(shabbatDate: Date) {
    const nextShabbat = new Date(shabbatDate);
    nextShabbat.setDate(shabbatDate.getDate() + 7);
    const specialDayStatus = isSpecialDay(nextShabbat);
    
    // If next Shabbat is special, this is the last chance to say it
    if (specialDayStatus.isSpecial) {
      // Calculate when it will be allowed again (after the special period)
      let nextAllowedDate = new Date(nextShabbat);
      nextAllowedDate.setDate(nextAllowedDate.getDate() + 7); // At least next week
      
      return {
        shouldSay: true,
        isLastShabbosBeforeOmission: true,
        reason: specialDayStatus.reason,
        nextAllowedDateString: nextAllowedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
      };
    }
    
    // Check if this Shabbat itself has a special day
    const thisSpecialDay = isSpecialDay(shabbatDate);
    if (thisSpecialDay.isSpecial) {
      return {
        shouldSay: false,
        reason: thisSpecialDay.reason
      };
    }
    
    return null;
  }
  
  const elMalehRachamimInfo = getElMalehRachamimInfo(shabbat);

  // General announcements for this week
  const generalAnnouncements: string[] = [
  ];

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
    kiddushLevanaInfo,
    elMalehRachamimInfo,
    aseretYemeiTeshuvaActive: false, // TODO: Implement if needed
  };
}
