import { JewishCalendar } from 'kosher-zmanim';
import { getZmanim } from '$lib/yomtov-info';

export function getKiddushLevanaInfo(shabbatDate: Date): {
  canSayTonight: boolean;
  reason?: string;
  isIdealTime?: boolean;
  lastChance?: boolean;
  lastMotzeiShabbos?: boolean;
  lastTimeToSay?: Date;
} {
  const shabbatZmanim = getZmanim(shabbatDate);
  const shkia = shabbatZmanim.shkia;
  const motzeiShabbatNightfall = new Date(shkia);
  motzeiShabbatNightfall.setMinutes(shkia.getMinutes() + 50);

  const jewishCal = new JewishCalendar(motzeiShabbatNightfall);
  const moladDateTime = jewishCal.getMoladAsDate();
  const moladDate = new Date(moladDateTime.toMillis());
  const timeSinceMolad = motzeiShabbatNightfall.getTime() - moladDate.getTime();
  const hoursSinceMolad = timeSinceMolad / (1000 * 60 * 60);

  const MIN_HOURS = 72;
  const IDEAL_HOURS = 168;
  const MAX_HOURS = 14 * 24 + 18;
  const lastTimeToSay = new Date(moladDate.getTime() + MAX_HOURS * 60 * 60 * 1000);

  if (hoursSinceMolad < MIN_HOURS) {
    return { canSayTonight: false, reason: 'Too early (before 3 days after molad)' };
  }

  if (hoursSinceMolad > MAX_HOURS) {
    return { canSayTonight: false, reason: 'Too late (after 14 days 18 hours)' };
  }

  const jewishMonth = jewishCal.getJewishMonth();
  const jewishDay = jewishCal.getJewishDayOfMonth();

  if (jewishMonth === 5 && jewishDay <= 9) {
    return { canSayTonight: false, reason: 'During the Nine Days' };
  }

  const motzeiShabbatJewishCal = new JewishCalendar(motzeiShabbatNightfall);
  if (motzeiShabbatJewishCal.isYomTov()) {
    return {
      canSayTonight: true,
      reason: 'Yom Tov tonight - say blessing only (no Psalms)',
      isIdealTime: hoursSinceMolad >= IDEAL_HOURS,
      lastTimeToSay: lastTimeToSay
    };
  }

  if (jewishMonth === 7 && jewishDay <= 10) {
    const nextMotzeiShabbos = new Date(motzeiShabbatNightfall);
    nextMotzeiShabbos.setDate(nextMotzeiShabbos.getDate() + 7);
    const isLastMotzeiShabbos = nextMotzeiShabbos.getTime() > lastTimeToSay.getTime();
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

  const nextMotzeiShabbos = new Date(motzeiShabbatNightfall);
  nextMotzeiShabbos.setDate(nextMotzeiShabbos.getDate() + 7);
  const isLastMotzeiShabbos = nextMotzeiShabbos.getTime() > lastTimeToSay.getTime();
  const tomorrowNight = new Date(motzeiShabbatNightfall);
  tomorrowNight.setDate(tomorrowNight.getDate() + 1);
  const isLastNight = tomorrowNight.getTime() > lastTimeToSay.getTime();
  const isIdeal = hoursSinceMolad >= IDEAL_HOURS;

  return {
    canSayTonight: true,
    isIdealTime: isIdeal,
    lastChance: isLastNight,
    lastMotzeiShabbos: isLastMotzeiShabbos && !isLastNight,
    lastTimeToSay: lastTimeToSay
  };
}