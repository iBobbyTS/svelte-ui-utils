import type { DateRangeFilterValue, DateRangePreset } from './types.js';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function formatDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateTime(date: Date) {
  return `${formatDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date: Date, weekStartsOn: 0 | 1) {
  const start = startOfDay(date);
  const day = start.getDay();
  const offset = weekStartsOn === 1 ? (day + 6) % 7 : day;
  return addDays(start, -offset);
}

export function endOfMonth(year: number, month: number) {
  return new Date(year, month, 0);
}

export function resolveDateRangePreset(
  preset: DateRangePreset,
  current: Date,
  weekStartsOn: 0 | 1 = 1
): DateRangeFilterValue {
  const today = startOfDay(current);

  if (preset === 'last24Hours') {
    const start = new Date(current.getTime() - 24 * 60 * 60 * 1000);
    return {
      startDate: formatDate(start),
      endDate: formatDate(current),
      preset,
      startDateTime: formatDateTime(start),
      endDateTime: formatDateTime(current)
    };
  }

  if (preset === 'last7Days') {
    return {
      startDate: formatDate(addDays(today, -6)),
      endDate: formatDate(today),
      preset
    };
  }

  if (preset === 'last30Days') {
    return {
      startDate: formatDate(addDays(today, -29)),
      endDate: formatDate(today),
      preset
    };
  }

  if (preset === 'thisWeek') {
    const start = startOfWeek(today, weekStartsOn);
    return {
      startDate: formatDate(start),
      endDate: formatDate(addDays(start, 6)),
      preset
    };
  }

  if (preset === 'thisMonth') {
    return {
      startDate: formatDate(new Date(today.getFullYear(), today.getMonth(), 1)),
      endDate: formatDate(endOfMonth(today.getFullYear(), today.getMonth() + 1)),
      preset
    };
  }

  if (preset === 'thisYear') {
    return {
      startDate: formatDate(new Date(today.getFullYear(), 0, 1)),
      endDate: formatDate(new Date(today.getFullYear(), 11, 31)),
      preset
    };
  }

  return {
    startDate: formatDate(today),
    endDate: formatDate(today),
    preset
  };
}
