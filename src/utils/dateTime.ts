const pad = (value: number) => String(value).padStart(2, '0');

export const formatLocalDateTimeInput = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const parseLocalDateTimeInput = (value: string): string | null => {
  const normalized = value.trim().replace('T', ' ');
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hours, minutes] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

export const formatReadableDateTime = (value?: string | null): string =>
  value ? new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Not set';
