import { HebrewDateFormatter, JewishCalendar, getZmanimJson } from 'kosher-zmanim';
import { getPesachDayNumber, getPesachLiturgicalNotices, getPesachDayName } from '$lib/pesach-details';
import { getYomTovTimes, formatDateKey, getYomTovAnnouncements } from '$lib/yomtov-info';
import yomtovTimesData from '$lib/yomtov-times.json';

function formatOmerNusach(day: number): string {
  if (day < 1 || day > 49) return '';

  const ones = ['', 'אחד', 'שני', 'שלשה', 'ארבעה', 'חמשה', 'ששה', 'שבעה', 'שמונה', 'תשעה'];
  const teens = ['עשרה', 'אחד עשר', 'שנים עשר', 'שלשה עשר', 'ארבעה עשר', 'חמשה עשר', 'ששה עשר', 'שבעה עשר', 'שמונה עשר', 'תשעה עשר'];
  const tensNames = ['', '', 'עשרים', 'שלשים', 'ארבעים'];

  let daysText: string;
  if (day === 1) {
    daysText = 'יום אחד';
  } else if (day <= 9) {
    daysText = `${ones[day]} ימים`;
  } else if (day <= 19) {
    daysText = `${teens[day - 10]} יום`;
  } else {
    const tens = Math.floor(day / 10);
    const units = day % 10;
    if (units === 0) {
      daysText = `${tensNames[tens]} יום`;
    } else {
      daysText = `${ones[units]} ו${tensNames[tens]} יום`;
    }
  }

  let weeksText = '';
  const weeks = Math.floor(day / 7);
  const rem = day % 7;
  if (weeks > 0) {
    const weekNames = ['', 'שבוע אחד', 'שני שבועות', 'שלשה שבועות', 'ארבעה שבועות', 'חמשה שבועות', 'ששה שבועות', 'שבעה שבועות'];
    const remNames = ['', 'ויום אחד', 'ושני ימים', 'ושלשה ימים', 'וארבעה ימים', 'וחמשה ימים', 'וששה ימים'];
    weeksText = ` שהם ${weekNames[weeks]}`;
    if (rem > 0) {
      weeksText += ` ${remNames[rem]}`;
    }
  }

  return `היום ${daysText}${weeksText} לעומר`;
}

// Disable prerendering for this page since it's dynamic based on query parameters
export const prerender = false;
export const ssr = true;

type YomTovTimesJson = {
  [year: string]: {
    pesach?: {
      [dateKey: string]: {
        shacharit?: string;
        mincha?: string;
        maariv?: string;
        mincha_maariv?: string;
      };
    };
  } | string;
};

/**
 * Get zmanim (times) for a specific date
 */
function getZmanim(date: Date) {
  const options = {
    date,
    locationName: 'Fair Lawn, NJ',
    latitude: 40.940866,
    longitude: -74.126082,
    timeZoneId: 'America/New_York',
  };
  const zmanim = getZmanimJson(options);

  const jewishCal = new JewishCalendar(date);

  // Parse shkia (sunset) from zmanim output
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

  // Build Hebrew date string
  const day = jewishCal.getJewishDayOfMonth();
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
  };
}

export async function load({ url }: { url: URL }) {
  const typedYomTov = yomtovTimesData as YomTovTimesJson;
  const pesachDateKeys = Object.keys(typedYomTov)
    .filter((key) => key !== 'lastUpdated')
    .flatMap((yearKey) => {
      const yearData = typedYomTov[yearKey];
      if (!yearData || typeof yearData !== 'object' || !yearData.pesach) return [];
      return Object.keys(yearData.pesach);
    })
    .sort();

  function dateFromKey(dateKey: string): Date {
    return new Date(`${dateKey}T12:00:00`);
  }

  // Get English date
  const englishDateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  };
  // Announcements by date
  const announcementsByDate: Record<string, string[]> = {
    '2026-04-07': [
    ],
    '2026-04-08': [
        "Candle lighting 8:19pm",
    ],
    '2026-04-09': [
        "Havdalah 8:20pm",
    ]
  };

  const days = pesachDateKeys.map((dateKey, index) => {
    const date = dateFromKey(dateKey);
    const pesachDayNumber = getPesachDayNumber(date) || (index + 1);
    const pesachDayName = getPesachDayName(pesachDayNumber);
    const englishDate = date.toLocaleDateString('en-US', englishDateOptions);
    const zmanim = getZmanim(date);
    const { shacharit, mincha, maariv, minchaAndMaariv } = getYomTovTimes(date, 'pesach');
    const nextCivilDay = new Date(date);
    nextCivilDay.setDate(date.getDate() + 1);
    const omerCal = new JewishCalendar(nextCivilDay);
    const omerDay = omerCal.getDayOfOmer();
    const hebrewFormatter = new HebrewDateFormatter();
    hebrewFormatter.setHebrewFormat(true);

    return {
      key: dateKey,
      number: pesachDayNumber,
      name: pesachDayName,
      hebrewDate: zmanim.hebrewDate,
      englishDate,
      shacharit,
      mincha,
      maariv,
      minchaAndMaariv,
      omer: omerDay > 0
        ? {
          day: omerDay,
          hebrewText: hebrewFormatter.formatOmer(omerCal),
          nusach: formatOmerNusach(omerDay)
        }
        : null,
      shacharitNotices: getPesachLiturgicalNotices(date, 'shacharit'),
      minchaNotices: getPesachLiturgicalNotices(date, 'mincha'),
      maarivNotices: getPesachLiturgicalNotices(date, 'maariv'),
      announcements: getYomTovAnnouncements(date, announcementsByDate),
    };
  });

  const defaultDateKey = pesachDateKeys.length > 0
    ? (pesachDateKeys.find((key) => key >= formatDateKey(new Date())) || pesachDateKeys[0])
    : formatDateKey(new Date());

  return {
    days,
    totalDays: days.length,
    currentDateKey: defaultDateKey,
  };
}
