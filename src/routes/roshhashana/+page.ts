import { JewishCalendar, getZmanimJson } from 'kosher-zmanim';
import { getRoshHashanaDayNumber, getRoshHashanaDayName, getRoshHashanaDateRange, getRoshHashanaLiturgicalNotices } from '$lib/rosh-hashana-details';
import { getYomTovTimes, formatDateKey, getYomTovAnnouncements, getParshaForShabbat, getMinchaTorahReading } from '$lib/yomtov-info';
import { getKiddushLevanaInfo } from '$lib/yomtov-utils';

export const prerender = true;
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
  // Derive dates from the calendar: Erev Rosh Hashana (29 Elul) through Day 2 (2 Tishrei)
  const roshHashanaDates = getRoshHashanaDateRange();

  const englishDateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  };

  // Announcements keyed by date — update as needed each year
  const announcementsByDate: Record<string, string[]> = {
    // '2026-09-11': ['Candle lighting 7:00pm'],
    // '2026-09-13': ['Havdalah 8:00pm'],
  };

  const days = roshHashanaDates.map((date) => {
    const dateKey = formatDateKey(date);
    const dayOfWeek = date.getDay(); // 0=Sun, 5=Fri, 6=Sat
    const isShabbat = dayOfWeek === 6;
    const isErevShabbat = dayOfWeek === 5; // Friday
    const parsha = getParshaForShabbat(date);
    const minchaTorahReading = getMinchaTorahReading(date);

    const jewishCal = new JewishCalendar(date);
    const jewishMonth = jewishCal.getJewishMonth();
    const isErev = jewishMonth === 6; // 29 Elul = Erev Rosh Hashana
    const roshHashanaDayNumber = isErev ? 0 : (getRoshHashanaDayNumber(date) ?? 0);

    let name: string;
    if (isErev) {
      name = 'ערב ראש השנה';
    } else {
      const baseName = getRoshHashanaDayName(roshHashanaDayNumber);
      name = isShabbat ? `שבת — ${baseName}` : baseName;
    }

    const zmanim = getZmanim(date);
    const { shacharit, mincha, maariv, minchaAndMaariv, notes } = getYomTovTimes(date, 'roshhashana');

    // Liturgical notices
    const shacharitNotices = isErev
      ? { additions: [], omissions: [] }
      : getRoshHashanaLiturgicalNotices(date, 'shacharit');
    const minchaNotices = isErev
      ? { additions: [], omissions: [] }
      : getRoshHashanaLiturgicalNotices(date, 'mincha');
    // Erev Maariv is the first night of Yom Tov — יעלה ויבא and המלך הקדוש are said
    const maarivNotices = isErev
      ? { additions: ['יעלה ויבא', 'המלך הקדוש'], omissions: [] }
      : getRoshHashanaLiturgicalNotices(date, 'maariv');

    return {
      key: dateKey,
      number: roshHashanaDayNumber,
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
      omer: null, // No Omer count around Rosh Hashana
      shacharitNotices,
      minchaNotices,
      maarivNotices,
      notes,
      announcements: getYomTovAnnouncements(date, announcementsByDate),
    };
  });

  const today = new Date();
  const kiddushLevanaInfo = getKiddushLevanaInfo(today);
  const todayKey = formatDateKey(today);

  const currentDateKey =
    days.find((d) => d.key >= todayKey)?.key ?? (days[0]?.key ?? todayKey);
  const year = currentDateKey.slice(0, 4);

  return {
    days,
    totalDays: days.length,
    currentDateKey,
    title: `Rosh Hashana ${year}`,
    pageTitle: 'Commons Minyan Rosh Hashana Announcements',
    holidayKey: 'roshhashana',
    props: {
      kiddushLevanaInfo,
    },
  };
}
