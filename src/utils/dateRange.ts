export const endOfDay = (value: Date): Date => {
  const next = new Date(value);
  next.setHours(23, 59, 59, 999);
  return next;
};

export const isWithinDateRange = (value: string, range: { from?: string; to?: string }): boolean => {
  const date = new Date(value);
  if (range.from && date < new Date(range.from)) return false;
  if (range.to && date > endOfDay(new Date(range.to))) return false;
  return true;
};
