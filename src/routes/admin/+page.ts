import { JewishCalendar, HebrewDateFormatter } from 'kosher-zmanim';

export async function load() {
	const today = new Date();
	const dayOfWeek = today.getDay();
	const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
	const friday = new Date(today);
	friday.setDate(today.getDate() + daysUntilFriday);

	const shabbat = new Date(friday);
	shabbat.setDate(friday.getDate() + 1);

	const shabbatJewishCal = new JewishCalendar(shabbat);
	const fmt = new HebrewDateFormatter();

	const parshaNames = [
		'אין',
		'בראשית',
		'נח',
		'לך לך',
		'וירא',
		'חיי שרה',
		'תולדות',
		'ויצא',
		'וישלח',
		'וישב',
		'מקץ',
		'ויגש',
		'ויחי',
		'שמות',
		'וארא',
		'בא',
		'בשלח',
		'יתרו',
		'משפטים',
		'תרומה',
		'תצוה',
		'כי תשא',
		'ויקהל',
		'פקודי',
		'ויקרא',
		'צו',
		'שמיני',
		'תזריע',
		'מצרע',
		'אחרי מות',
		'קדושים',
		'אמור',
		'בהר',
		'בחקתי',
		'במדבר',
		'נשא',
		'בהעלתך',
		'שלח',
		'קרח',
		'חקת',
		'בלק',
		'פנחס',
		'מטות',
		'מסעי',
		'דברים',
		'ואתחנן',
		'עקב',
		'ראה',
		'שפטים',
		'כי תצא',
		'כי תבוא',
		'נצבים',
		'וילך',
		'האזינו',
		'וזאת הברכה'
	];

	const parshaNum = shabbatJewishCal.getParsha();
	const parsha =
		parshaNum >= 0 && parshaNum < parshaNames.length ? parshaNames[parshaNum] : 'לא ידוע';
	const displayParsha = parsha === 'אין' ? '' : parsha;

	const englishDate = shabbat.toLocaleDateString('en-US', {
		weekday: 'long',
		month: 'short',
		day: 'numeric'
	});

	const hebrewDate = fmt.format(shabbatJewishCal);

	return {
		parsha: displayParsha,
		englishDate,
		hebrewDate
	};
}
