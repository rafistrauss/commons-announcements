import { json } from '@sveltejs/kit';
import { JewishCalendar } from 'kosher-zmanim';

export async function GET({ url }) {
	try {
		const offset = parseInt(url.searchParams.get('offset') || '0', 10);

		// Get the Shabbat for the given week offset
		const today = new Date();
		const dayOfWeek = today.getDay();
		const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
		const friday = new Date(today);
		friday.setDate(today.getDate() + daysUntilFriday + offset * 7);

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
		const displayParsha = parsha === 'אין' ? '' : parsha;

		const englishDate = shabbat.toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'short',
			day: 'numeric'
		});

		return json({ parsha: displayParsha, englishDate });
	} catch (error) {
		console.error('Error calculating parsha:', error);
		return json({ parsha: '', englishDate: '' }, { status: 500 });
	}
}
