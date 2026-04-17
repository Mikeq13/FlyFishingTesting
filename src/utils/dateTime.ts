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

export const formatLocalTimeInput = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const parseLocalTimeInput = (value: string): { hours: number; minutes: number } | null => {
  const normalized = value.trim();
  const match = normalized.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, hours, minutes] = match;
  const parsedHours = Number(hours);
  const parsedMinutes = Number(minutes);
  if (parsedHours < 0 || parsedHours > 23 || parsedMinutes < 0 || parsedMinutes > 59) return null;
  return { hours: parsedHours, minutes: parsedMinutes };
};

export const combineDateAndTime = (baseDate: Date, timeValue: string): string | null => {
  const parsed = parseLocalTimeInput(timeValue);
  if (!parsed) return null;
  const combined = new Date(baseDate);
  combined.setHours(parsed.hours, parsed.minutes, 0, 0);
  return combined.toISOString();
};
