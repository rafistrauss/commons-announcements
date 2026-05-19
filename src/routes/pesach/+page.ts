import { HebrewDateFormatter, JewishCalendar, getZmanimJson } from 'kosher-zmanim';
import { getPesachDayNumber, getPesachLiturgicalNotices, getPesachDayName } from '$lib/pesach-details';
import { getYomTovTimes, formatDateKey, getYomTovAnnouncements, getYomTovDateRange, getParshaForShabbat, getMinchaTorahReading } from '$lib/yomtov-info';

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

export const prerender = false;
export const ssr = true;

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

  let shkia;
  const basicZmanim = zmanim.BasicZmanim as any;
  if (basicZmanim?.Sunset) {
    shkia = new Date(basicZmanim.Sunset);
  } else if (basicZmanim?.sunset) {
    shkia = new Date(basicZmanim.sunset);
  } else {
    shkia = new Date(date);
    shkia.setHours(19, 30, 0, 0);
  }

  const day = jewishCal.getJewishDayOfMonth();
  const jewishMonthNames = [
    '', 'ניסן', 'אייר', 'סיון', 'תמוז', 'אב', 'אלול',
    'תשרי', 'חשון', 'כסלו', 'טבת', 'שבט', 'אדר', 'אדר ב\'', 'אדר א\'',
  ];
  const month = jewishMonthNames[jewishCal.getJewishMonth()];
  const year = jewishCal.getJewishYear();
  const hebrewNumerals = [
    '', 'א\'', 'ב\'', 'ג\'', 'ד\'', 'ה\'', 'ו\'', 'ז\'', 'ח\'', 'ט\'', 'י\'',
    'י"א', 'י"ב', 'י"ג', 'י"ד', 'ט"ו', 'ט"ז', 'י"ז', 'י"ח', 'י"ט', 'כ\'',
    'כ"א', 'כ"ב', 'כ"ג', 'כ"ד', 'כ"ה', 'כ"ו', 'כ"ז', 'כ"ח', 'כ"ט', 'ל\'',
  ];
  return { shkia, hebrewDate: `${hebrewNumerals[day] || day} ${month} ${year}` };
}

export async function load({ url }: { url: URL }) {
  // Derive dates from the calendar: Erev Pesach (14 Nisan) through Acharon Shel Pesach (22 Nisan)
  const pesachDates = getYomTovDateRange(1, 14, 22); // Nisan = 1

  const englishDateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  };

  // Announcements keyed by date — update as needed each year
  const announcementsByDate: Record<string, string[]> = {
    '2026-04-07': [],
    '2026-04-08': ['Candle lighting 8:19pm'],
    '2026-04-09': ['Havdalah 8:20pm'],
  };

  const hebrewFormatter = new HebrewDateFormatter();
  hebrewFormatter.setHebrewFormat(true);

  const days = pesachDates.map((date) => {
    const dateKey = formatDateKey(date);
    const dayOfWeek = date.getDay(); // 0=Sun, 5=Fri, 6=Sat
    const isShabbat = dayOfWeek === 6;
    const isErevShabbat = dayOfWeek === 5; // Friday
    const parsha = getParshaForShabbat(date); // null for Shabbat Yom Tov / Chol HaMoed
    const minchaTorahReading = getMinchaTorahReading(date);

    const jewishCal = new JewishCalendar(date);
    const jewishDay = jewishCal.getJewishDayOfMonth();
    const isErev = jewishDay === 14; // 14 Nisan = Erev Pesach
    const pesachDayNumber = isErev ? 0 : (getPesachDayNumber(date) ?? 0);

    let name: string;
    if (isErev) {
      name = 'ערב פסח';
    } else {
      const baseName = getPesachDayName(pesachDayNumber);
      name = isShabbat ? `שבת — ${baseName}` : baseName;
    }

    const zmanim = getZmanim(date);
    const { shacharit, mincha, maariv, minchaAndMaariv, notes } = getYomTovTimes(date, 'pesach');

    // Omer: count the night that begins this day
    let omer: { day: number; hebrewText: string; nusach: string } | null = null;
    if (!isErev) {
      const nextCivilDay = new Date(date);
      nextCivilDay.setDate(date.getDate() + 1);
      const omerCal = new JewishCalendar(nextCivilDay);
      const omerDay = omerCal.getDayOfOmer();
      if (omerDay > 0) {
        omer = {
          day: omerDay,
          hebrewText: hebrewFormatter.formatOmer(omerCal),
          nusach: formatOmerNusach(omerDay),
        };
      }
    }

    // Liturgical notices
    const shacharitNotices = isErev
      ? { additions: [], omissions: [] }
      : getPesachLiturgicalNotices(date, 'shacharit');
    const minchaNotices = isErev
      ? { additions: [], omissions: [] }
      : getPesachLiturgicalNotices(date, 'mincha');
    const maarivNotices = isErev
      ? { additions: [], omissions: [] }
      : getPesachLiturgicalNotices(date, 'maariv');

    return {
      key: dateKey,
      number: pesachDayNumber,
      name,
      hebrewDate: zmanim.hebrewDate,
      englishDate: date.toLocaleDateString('en-US', englishDateOptions),
      isErev,
      isShabbat,
      isErevShabbat,
      isShabbatYomTov: isShabbat && !isErev,
      parsha,
      minchaTorahReading,
      shacharit,
      mincha,
      maariv,
      minchaAndMaariv,
      noShacharit: shacharit === 'NONE',
      noMincha: mincha === 'NONE',
      noMaariv: maariv === 'NONE',
      noMinchaAndMaariv: minchaAndMaariv === 'NONE',
      omer,
      shacharitNotices,
      minchaNotices,
      maarivNotices,
      notes,
      announcements: getYomTovAnnouncements(date, announcementsByDate),
    };
  });

  const today = formatDateKey(new Date());
  const currentDateKey =
    days.find((d) => d.key >= today)?.key ?? (days[0]?.key ?? today);
  const year = currentDateKey.slice(0, 4);

  return {
    days,
    totalDays: days.length,
    currentDateKey,
    title: `Pesach ${year}`,
    pageTitle: 'Commons Minyan Pesach Announcements',
    holidayKey: 'pesach',
  };
}
