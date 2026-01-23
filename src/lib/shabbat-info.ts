import { JewishCalendar } from 'kosher-zmanim';
import minyanTimes from '$lib/minyan-times.json';

export function getShachrisShabbatInfo(date: Date) {
  let isThereShachris = false;
  // Find the next Shabbat (Saturday)
  const shabbat = new Date(date);
  shabbat.setDate(date.getDate() + ((6 - date.getDay() + 7) % 7));

  const friday = new Date(shabbat);
  friday.setDate(shabbat.getDate() - 1);

  const friday_key = friday.toISOString().slice(0, 10);

  if (minyanTimes.times?.[friday_key]?.shabbatShacharis) {
    isThereShachris = true;
  }


  const jewishCal = new JewishCalendar(shabbat);

  // Parsha calculation (same as in main page)
  const parshaNames = [
    'אין', 'בראשית', 'נח', 'לך לך', 'וירא', 'חיי שרה', 'תולדות', 'ויצא', 'וישלח', 'וישב', 'מקץ', 'ויגש', 'ויחי',
    'שמות', 'וארא', 'בא', 'בשלח', 'יתרו', 'משפטים', 'תרומה', 'תצוה', 'כי תשא', 'ויקהל', 'פקודי', 'ויקרא', 'צו', 'שמני',
    'תזריע', 'מצרע', 'אחרי מות', 'קדושים', 'אמר', 'בהר', 'בחקתי', 'במדבר', 'נשא', 'בהעלתך', 'שלח', 'קרח', 'חקת',
    'בלק', 'פנחס', 'מטות', 'מסעי', 'דברים', 'ואתחנן', 'עקב', 'ראה', 'שפטים', 'כי תצא', 'כי תבוא', 'נצבים', 'וילך', 'האזינו', 'וזאת הברכה'
  ];
  const parshaNum = jewishCal.getParsha();
  let parsha = parshaNum >= 0 && parshaNum < parshaNames.length ? parshaNames[parshaNum] : 'לא ידוע';

  // Hebrew date
  const day = jewishCal.getJewishDayOfMonth();
  const jewishMonthNames = [ '', 'ניסן', 'אייר', 'סיון', 'תמוז', 'אב', 'אלול', 'תשרי', 'חשון', 'כסלו', 'טבת', 'שבט', 'אדר', 'אדר ב\'', 'אדר א\'' ];
  const monthNum = jewishCal.getJewishMonth();
  const month = jewishMonthNames[monthNum];
  const year = jewishCal.getJewishYear();
  const hebrewNumerals = ['', 'א\'', 'ב\'', 'ג\'', 'ד\'', 'ה\'', 'ו\'', 'ז\'', 'ח\'', 'ט\'', 'י\'', 'י"א', 'י"ב', 'י"ג', 'י"ד', 'ט"ו', 'ט"ז', 'י"ז', 'י"ח', 'י"ט', 'כ\'', 'כ"א', 'כ"ב', 'כ"ג', 'כ"ד', 'כ"ה', 'כ"ו', 'כ"ז', 'כ"ח', 'כ"ט', 'ל\''];
  const hebrewDay = hebrewNumerals[day] || day.toString();
  const hebrewDate = `${hebrewDay} ${month} ${year}`;

  // English date
  const englishDate = shabbat.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return { shabbat, parsha, hebrewDate, englishDate, isThereShachris };
}
