/**
 * Utility to format and calculate production cycle times (Days, Hours, Minutes)
 */

/**
 * Splits total minutes into { days, hours, minutes, totalMinutes }
 */
export const decomposeMinutes = (totalMinutes) => {
  const total = Math.max(0, parseFloat(totalMinutes) || 0);
  const days = Math.floor(total / 1440);
  const remAfterDays = total % 1440;
  const hours = Math.floor(remAfterDays / 60);
  const minutes = Math.round((remAfterDays % 60) * 100) / 100;
  return { days, hours, minutes, totalMinutes: total };
};

/**
 * Calculates total minutes from days, hours, minutes
 */
export const calculateTotalMinutes = (days, hours, minutes) => {
  const d = Math.max(0, parseFloat(days) || 0);
  const h = Math.max(0, parseFloat(hours) || 0);
  const m = Math.max(0, parseFloat(minutes) || 0);
  return +(d * 1440 + h * 60 + m).toFixed(2);
};

/**
 * Formats duration from days, hours, minutes or total minutes
 * e.g., "1 Day, 5 Hours, 3 Mins" or "1d 5h 3m"
 */
export const formatDuration = (days, hours, minutes) => {
  const totalMins = calculateTotalMinutes(days, hours, minutes);
  const decomposed = decomposeMinutes(totalMins);
  const d = decomposed.days;
  const h = decomposed.hours;
  const m = decomposed.minutes;

  if (totalMins === 0) {
    return {
      full: '0 Minutes',
      short: '0m',
      badge: '0 Mins',
      days: 0,
      hours: 0,
      minutes: 0,
      totalMinutes: 0
    };
  }

  const parts = [];
  const shortParts = [];

  if (d > 0) {
    parts.push(`${d} ${d === 1 ? 'Day' : 'Days'}`);
    shortParts.push(`${d}d`);
  }
  if (h > 0) {
    parts.push(`${h} ${h === 1 ? 'Hour' : 'Hours'}`);
    shortParts.push(`${h}h`);
  }
  if (m > 0 || parts.length === 0) {
    const formattedM = Number.isInteger(m) ? m : m.toFixed(1);
    parts.push(`${formattedM} ${formattedM == 1 ? 'Minute' : 'Mins'}`);
    shortParts.push(`${formattedM}m`);
  }

  const fullStr = parts.join(', ');
  const shortStr = shortParts.join(' ');
  const badgeStr = `${fullStr} (${totalMins.toLocaleString()} mins)`;

  return {
    full: fullStr,
    short: shortStr,
    badge: badgeStr,
    days: d,
    hours: h,
    minutes: m,
    totalMinutes: totalMins
  };
};

/**
 * Universal formatProductionTime helper supporting either (days, hours, minutes)
 * or legacy (val, unit, minutes) or single total minutes.
 */
export const formatProductionTime = (val, unit, minutes, daysParam, hoursParam) => {
  let totalMins = 0;

  if (daysParam !== undefined || hoursParam !== undefined) {
    totalMins = calculateTotalMinutes(daysParam, hoursParam, minutes || val);
  } else if (minutes !== undefined && minutes !== null && minutes !== '') {
    totalMins = parseFloat(minutes) || 0;
  } else if (val !== undefined && val !== null && val !== '') {
    const v = parseFloat(val) || 0;
    const u = (unit || 'Minutes').toLowerCase();
    if (u === 'days' || u === 'day') totalMins = v * 1440;
    else if (u === 'hours' || u === 'hour') totalMins = v * 60;
    else totalMins = v;
  }

  const duration = formatDuration(0, 0, totalMins);
  return {
    label: duration.full,
    badge: duration.badge,
    short: duration.short,
    equivalentMins: duration.totalMinutes,
    days: duration.days,
    hours: duration.hours,
    minutes: duration.minutes
  };
};

/**
 * Convert value and unit to total minutes
 */
export const calculateMinutesFromUnit = (val, unit) => {
  const v = parseFloat(val) || 0;
  const u = (unit || 'Minutes').toLowerCase();
  if (u === 'days' || u === 'day') return +(v * 1440).toFixed(2);
  if (u === 'hours' || u === 'hour') return +(v * 60).toFixed(2);
  return +v.toFixed(2);
};
