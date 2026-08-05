import { json } from '@sveltejs/kit';
import { JewishCalendar } from 'kosher-zmanim';

export async function GET() {
	try {
		// Get this Friday
		const today = new Date();
		const dayOfWeek = today.getDay();
		const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
		const friday = new Date(today);
		friday.setDate(today.getDate() + daysUntilFriday);

		// Get Saturday (Shabbat)
		const shabbat = new Date(friday);
		shabbat.setDate(friday.getDate() + 1);

		// Get the weekly parsha from Saturday
		const shabbatJewishCal = new JewishCalendar(shabbat);
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
			parshaNum >= 0 && parshaNum < parshaNames.length
				? parshaNames[parshaNum]
				: 'לא ידוע';

		// Filter out 'אין' since it's not a real parsha we want to show
		const displayParsha = parsha === 'אין' ? '' : parsha;

		return json({ parsha: displayParsha, parshaNum });
	} catch (error) {
		console.error('Error calculating parsha:', error);
		return json({ parsha: '', parshaNum: -1 }, { status: 500 });
	}
}
