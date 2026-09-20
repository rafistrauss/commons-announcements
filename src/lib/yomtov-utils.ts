import { JewishCalendar } from 'kosher-zmanim';
import { getZmanim } from '$lib/yomtov-info';

const FAIR_LAWN_LATITUDE = 40.940866;
const FAIR_LAWN_LONGITUDE = -74.126082;
const NEW_YORK_TIME_ZONE = 'America/New_York';

export type KiddushLevanaInfo = {
  canSayTonight: boolean;
  reason?: string;
  isIdealTime?: boolean;
  lastChance?: boolean;
  lastMotzeiShabbos?: boolean;
  isFridayNight?: boolean;
  lastTimeToSay?: Date;
  moonDirection?: string;
  moonAltitudeDescription?: string;
  moonLookInstructions?: string;
};

/**
 * Get the hour-of-day (0-23) of a Date as it reads in America/New_York,
 * regardless of the server's own local timezone.
 */
function getNYHour(date: Date): number {
  const hourPart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone: 'America/New_York'
  }).formatToParts(date).find((p) => p.type === 'hour')?.value;
  const hour = hourPart ? parseInt(hourPart, 10) : date.getHours();
  return hour === 24 ? 0 : hour;
}

/**
 * Kiddush Levana's cutoff is an exact moment in time, but it should be presented
 * as "the last night" to say it. A calendar "night" (e.g. Friday night) spans
 * from nightfall through the following morning, so if the cutoff moment falls
 * in the morning/early hours (America/New_York time), the last valid night is
 * the previous calendar date.
 */
function getLastNightDate(cutoff: Date): Date {
  if (getNYHour(cutoff) < 12) {
    return new Date(cutoff.getTime() - 24 * 60 * 60 * 1000);
  }
  return cutoff;
}

function getNYDateParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: NEW_YORK_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));

  return {
    year: parseInt(values.year, 10),
    month: parseInt(values.month, 10),
    day: parseInt(values.day, 10)
  };
}

function getTimeZoneOffsetMillis(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);

  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  const utcFromParts = Date.UTC(
    parseInt(values.year, 10),
    parseInt(values.month, 10) - 1,
    parseInt(values.day, 10),
    parseInt(values.hour, 10) % 24,
    parseInt(values.minute, 10),
    parseInt(values.second, 10)
  );

  return utcFromParts - date.getTime();
}

function getDateInTimeZone(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const date = new Date(utcGuess);
  const offset = getTimeZoneOffsetMillis(date, timeZone);
  return new Date(utcGuess - offset);
}

function parseMaarivTime(baseDate: Date, maarivTime?: string | null): Date | null {
  if (!maarivTime) return null;

  const match = maarivTime.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2] ?? '0', 10);
  const meridiem = match[3].toLowerCase();

  if (meridiem === 'pm' && hour !== 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;

  const { year, month, day } = getNYDateParts(baseDate);
  return getDateInTimeZone(year, month, day, hour, minute, NEW_YORK_TIME_ZONE);
}

function getObservationTime(anchorDate: Date, maarivTime?: string | null): Date {
  const parsedTime = parseMaarivTime(anchorDate, maarivTime);
  if (!parsedTime) return anchorDate;

  if (parsedTime.getTime() < anchorDate.getTime() - 6 * 60 * 60 * 1000) {
    return new Date(parsedTime.getTime() + 24 * 60 * 60 * 1000);
  }

  return parsedTime;
}

function toJulianDays(date: Date): number {
  return date.getTime() / 86400000 - 0.5 + 2440588 - 2451545;
}

function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

function getMoonPosition(date: Date): { azimuthDegrees: number; altitudeDegrees: number } {
  const dayCount = toJulianDays(date);
  const rad = Math.PI / 180;
  const obliquity = 23.4397 * rad;
  const latitude = FAIR_LAWN_LATITUDE * rad;
  const longitudeWest = FAIR_LAWN_LONGITUDE * rad;

  const meanLongitude = (218.316 + 13.176396 * dayCount) * rad;
  const meanAnomaly = (134.963 + 13.064993 * dayCount) * rad;
  const meanDistance = (93.272 + 13.22935 * dayCount) * rad;

  const eclipticLongitude = meanLongitude + 6.289 * rad * Math.sin(meanAnomaly);
  const eclipticLatitude = 5.128 * rad * Math.sin(meanDistance);

  const rightAscension = Math.atan2(
    Math.sin(eclipticLongitude) * Math.cos(obliquity) - Math.tan(eclipticLatitude) * Math.sin(obliquity),
    Math.cos(eclipticLongitude)
  );
  const declination = Math.asin(
    Math.sin(eclipticLatitude) * Math.cos(obliquity) +
      Math.cos(eclipticLatitude) * Math.sin(obliquity) * Math.sin(eclipticLongitude)
  );

  const siderealTime = (280.16 + 360.9856235 * dayCount) * rad - longitudeWest;
  const hourAngle = siderealTime - rightAscension;

  const altitude = Math.asin(
    Math.sin(latitude) * Math.sin(declination) +
      Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle)
  );
  const azimuth = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(latitude) - Math.tan(declination) * Math.cos(latitude)
  );

  return {
    azimuthDegrees: normalizeDegrees((azimuth * 180) / Math.PI + 180),
    altitudeDegrees: (altitude * 180) / Math.PI
  };
}

function getCompassDirection(azimuthDegrees: number): string {
  const directions = [
    'north',
    'north-northeast',
    'northeast',
    'east-northeast',
    'east',
    'east-southeast',
    'southeast',
    'south-southeast',
    'south',
    'south-southwest',
    'southwest',
    'west-southwest',
    'west',
    'west-northwest',
    'northwest',
    'north-northwest'
  ];

  return directions[Math.round(azimuthDegrees / 22.5) % directions.length];
}

function getAltitudeDescription(altitudeDegrees: number): string {
  if (altitudeDegrees <= 2) return 'right on the horizon';
  if (altitudeDegrees <= 10) return 'just above the horizon';
  if (altitudeDegrees <= 20) return 'low above the horizon';
  if (altitudeDegrees <= 35) return 'about a quarter of the way up';
  if (altitudeDegrees <= 55) return 'about halfway up';
  if (altitudeDegrees <= 75) return 'high in the sky';
  return 'very high overhead';
}

function getMoonGuidance(observationTime: Date): Pick<KiddushLevanaInfo, 'moonDirection' | 'moonAltitudeDescription' | 'moonLookInstructions'> {
  const { azimuthDegrees, altitudeDegrees } = getMoonPosition(observationTime);
  const moonDirection = getCompassDirection(azimuthDegrees);
  const roundedAltitude = Math.max(0, Math.round(altitudeDegrees));
  const moonAltitudeDescription = getAltitudeDescription(altitudeDegrees);

  if (altitudeDegrees <= 0) {
    return {
      moonDirection,
      moonAltitudeDescription: 'at or below the horizon',
      moonLookInstructions: `At Maariv time, look toward the ${moonDirection}; the moon will be right by the horizon.`
    };
  }

  const fistsHigh = Math.max(1, Math.round(roundedAltitude / 10));
  return {
    moonDirection,
    moonAltitudeDescription,
    moonLookInstructions: `At Maariv time, look toward the ${moonDirection}, ${moonAltitudeDescription} (${roundedAltitude}° up, about ${fistsHigh} fist${fistsHigh === 1 ? '' : 's'} above the horizon).`
  };
}

export function getKiddushLevanaInfo(shabbatDate: Date, maarivTime?: string | null): KiddushLevanaInfo {
  const shabbatZmanim = getZmanim(shabbatDate);
  const shkia = shabbatZmanim.shkia;
  const motzeiShabbatNightfall = new Date(shkia);
  motzeiShabbatNightfall.setMinutes(shkia.getMinutes() + 50);
  const motzeiShabbatObservationTime = getObservationTime(motzeiShabbatNightfall, maarivTime);

  const jewishCal = new JewishCalendar(motzeiShabbatNightfall);
  const moladDateTime = jewishCal.getMoladAsDate();
  const moladDate = new Date(moladDateTime.toMillis());
  const timeSinceMolad = motzeiShabbatObservationTime.getTime() - moladDate.getTime();
  const hoursSinceMolad = timeSinceMolad / (1000 * 60 * 60);

  const MIN_HOURS = 72;
  const IDEAL_HOURS = 168;
  const MAX_HOURS = 14 * 24 + 18;
  const lastTimeToSay = new Date(moladDate.getTime() + MAX_HOURS * 60 * 60 * 1000);

  if (hoursSinceMolad < MIN_HOURS) {
    return { canSayTonight: false, reason: 'Too early (before 3 days after molad)' };
  }

  if (hoursSinceMolad > MAX_HOURS) {
    const fridayBeforeShabbat = new Date(shabbatDate);
    fridayBeforeShabbat.setDate(fridayBeforeShabbat.getDate() - 1);
    const fridayShkia = getZmanim(fridayBeforeShabbat).shkia;
    const fridayNightfall = new Date(fridayShkia);
    fridayNightfall.setMinutes(fridayShkia.getMinutes() + 50);
    const fridayHoursSinceMolad = (fridayNightfall.getTime() - moladDate.getTime()) / (1000 * 60 * 60);

    if (fridayHoursSinceMolad >= MIN_HOURS && fridayHoursSinceMolad <= MAX_HOURS) {
      const fridayJewishCal = new JewishCalendar(fridayNightfall);
      if (
        !fridayJewishCal.isYomTov() &&
        !(fridayJewishCal.getJewishMonth() === 5 && fridayJewishCal.getJewishDayOfMonth() <= 9)
      ) {
        return {
          canSayTonight: true,
          reason: 'Last chance - say it Friday night (Motzei Shabbat will be too late)',
          lastChance: true,
          isFridayNight: true,
          isIdealTime: fridayHoursSinceMolad >= IDEAL_HOURS,
          lastTimeToSay: getLastNightDate(lastTimeToSay),
          ...getMoonGuidance(fridayNightfall)
        };
      }
    }

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
      lastTimeToSay: getLastNightDate(lastTimeToSay),
      ...getMoonGuidance(motzeiShabbatObservationTime)
    };
  }

  if (jewishMonth === 7 && jewishDay <= 10) {
    const nextMotzeiShabbos = new Date(motzeiShabbatObservationTime);
    nextMotzeiShabbos.setDate(nextMotzeiShabbos.getDate() + 7);
    const isLastMotzeiShabbos = nextMotzeiShabbos.getTime() > lastTimeToSay.getTime();
    const tomorrowNight = new Date(motzeiShabbatObservationTime);
    tomorrowNight.setDate(tomorrowNight.getDate() + 1);
    const isLastNight = tomorrowNight.getTime() > lastTimeToSay.getTime();

    if (isLastMotzeiShabbos || isLastNight) {
      return {
        canSayTonight: true,
        reason: 'During first 10 days of Tishrei (many wait, but say it if this is your last chance)',
        lastChance: isLastNight,
        lastMotzeiShabbos: isLastMotzeiShabbos && !isLastNight,
        isIdealTime: hoursSinceMolad >= IDEAL_HOURS,
        lastTimeToSay: getLastNightDate(lastTimeToSay),
        ...getMoonGuidance(motzeiShabbatObservationTime)
      };
    }

    return {
      canSayTonight: false,
      reason: 'During first 10 days of Tishrei (many have custom not to say)'
    };
  }

  const nextMotzeiShabbos = new Date(motzeiShabbatObservationTime);
  nextMotzeiShabbos.setDate(nextMotzeiShabbos.getDate() + 7);
  const isLastMotzeiShabbos = nextMotzeiShabbos.getTime() > lastTimeToSay.getTime();
  const tomorrowNight = new Date(motzeiShabbatObservationTime);
  tomorrowNight.setDate(tomorrowNight.getDate() + 1);
  const isLastNight = tomorrowNight.getTime() > lastTimeToSay.getTime();
  const isIdeal = hoursSinceMolad >= IDEAL_HOURS;

  return {
    canSayTonight: true,
    isIdealTime: isIdeal,
    lastChance: isLastNight,
    lastMotzeiShabbos: isLastMotzeiShabbos && !isLastNight,
    lastTimeToSay: getLastNightDate(lastTimeToSay),
    ...getMoonGuidance(motzeiShabbatObservationTime)
  };
}