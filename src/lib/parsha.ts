import { JewishCalendar } from 'kosher-zmanim';

const PARSHA_NAMES = [
	'אין',
	'בראשית', 'נח', 'לך לך', 'וירא', 'חיי שרה', 'תולדות', 'ויצא', 'וישלח', 'וישב', 'מקץ',
	'ויגש', 'ויחי', 'שמות', 'וארא', 'בא', 'בשלח', 'יתרו', 'משפטים', 'תרומה', 'תצוה',
	'כי תשא', 'ויקהל', 'פקודי', 'ויקרא', 'צו', 'שמיני', 'תזריע', 'מצרע', 'אחרי מות',
	'קדושים', 'אמור', 'בהר', 'בחקתי', 'במדבר', 'נשא', 'בהעלתך', 'שלח', 'קרח', 'חקת',
	'בלק', 'פנחס', 'מטות', 'מסעי', 'דברים', 'ואתחנן', 'עקב', 'ראה', 'שפטים', 'כי תצא',
	'כי תבוא', 'נצבים', 'וילך', 'האזינו', 'וזאת הברכה'
];

export function getParshaForWeek(offset: number): { parsha: string; englishDate: string } {
	const today = new Date();
	const dayOfWeek = today.getDay();
	const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
	const friday = new Date(today);
	friday.setDate(today.getDate() + daysUntilFriday + offset * 7);

	const shabbat = new Date(friday);
	shabbat.setDate(friday.getDate() + 1);

	const shabbatJewishCal = new JewishCalendar(shabbat);
	const parshaNum = shabbatJewishCal.getParsha();
	const parshaName =
		parshaNum >= 0 && parshaNum < PARSHA_NAMES.length ? PARSHA_NAMES[parshaNum] : 'לא ידוע';
	const displayParsha = parshaName === 'אין' ? '' : parshaName;

	const englishDate = shabbat.toLocaleDateString('en-US', {
		weekday: 'long',
		month: 'short',
		day: 'numeric'
	});

	return { parsha: displayParsha, englishDate };
}
