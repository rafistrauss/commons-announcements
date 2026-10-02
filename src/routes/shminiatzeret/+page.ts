import { JewishCalendar, getZmanimJson } from 'kosher-zmanim';
import { getShminiAtzeretDayNumber, getShminiAtzeretDayName, getShminiAtzeretLiturgicalNotices } from '$lib/shmini-atzeret-details';
import { getYomTovTimes, formatDateKey, getYomTovAnnouncements, getYomTovDateRange, getParshaForShabbat, getMinchaTorahReading } from '$lib/yomtov-info';

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
  // Derive dates from the calendar: Erev Shmini Atzeret / Hoshana Rabah (21 Tishrei)
  // through Simchat Torah (23 Tishrei)
  const shminiAtzeretDates = getYomTovDateRange(7, 21, 23); // Tishrei = 7

  const englishDateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  };

  // Announcements keyed by date — update as needed each year
  const announcementsByDate: Record<string, string[]> = {
    // '2026-10-03': ['Candle lighting 6:15pm'],
    // '2026-10-04': ['Havdalah 7:10pm'],
  };

  const days = shminiAtzeretDates.map((date) => {
    const dateKey = formatDateKey(date);
    const dayOfWeek = date.getDay(); // 0=Sun, 5=Fri, 6=Sat
    const isShabbat = dayOfWeek === 6;
    const isErevShabbat = dayOfWeek === 5; // Friday
    const parsha = getParshaForShabbat(date);
    const minchaTorahReading = getMinchaTorahReading(date);

    const jewishCal = new JewishCalendar(date);
    const jewishDay = jewishCal.getJewishDayOfMonth();
    const isErev = jewishDay === 21; // 21 Tishrei = Hoshana Rabah / Erev Shmini Atzeret
    const shminiAtzeretDayNumber = isErev ? 0 : (getShminiAtzeretDayNumber(date) ?? 0);

    let name: string;
    if (isErev) {
      name = 'הושענא רבה';
    } else {
      const baseName = getShminiAtzeretDayName(shminiAtzeretDayNumber);
      name = isShabbat ? `שבת — ${baseName}` : baseName;
    }

    const zmanim = getZmanim(date);
    const { shacharit, mincha, maariv, minchaAndMaariv, notes } = getYomTovTimes(date, 'shminiatzeret');

    // Liturgical notices
    const shacharitNotices = isErev
      ? { additions: [], omissions: [] }
      : getShminiAtzeretLiturgicalNotices(date, 'shacharit');
    const minchaNotices = isErev
      ? { additions: [], omissions: [] }
      : getShminiAtzeretLiturgicalNotices(date, 'mincha');
    // Erev Maariv is the first night of Yom Tov — יעלה ויבא is said
    const maarivNotices = isErev
      ? { additions: ['יעלה ויבא'], omissions: [] }
      : getShminiAtzeretLiturgicalNotices(date, 'maariv');

    return {
      key: dateKey,
      number: shminiAtzeretDayNumber,
      name,
      hebrewDate: zmanim.hebrewDate,
      shkia: zmanim.shkia,
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
      omer: null, // No Omer count around Shmini Atzeret
      shacharitNotices,
      minchaNotices,
      maarivNotices,
      notes,
      announcements: getYomTovAnnouncements(date, announcementsByDate),
    };
  });

  const today = new Date();
  const todayKey = formatDateKey(today);

  const currentDateKey =
    days.find((d) => d.key >= todayKey)?.key ?? (days[0]?.key ?? todayKey);
  const year = currentDateKey.slice(0, 4);

  return {
    days,
    totalDays: days.length,
    currentDateKey,
    title: `Shmini Atzeret / Simchat Torah ${year}`,
    pageTitle: 'Commons Minyan Shmini Atzeret / Simchat Torah Announcements',
    holidayKey: 'shminiatzeret',
  };
}
