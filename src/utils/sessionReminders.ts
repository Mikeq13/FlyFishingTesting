export const normalizeReminderMarkers = (markers: number[], plannedDurationMinutes?: number): number[] => {
  const normalized = markers
    .filter((minute) => Number.isFinite(minute) && minute > 0)
    .map((minute) => Math.floor(minute));

  const filtered = typeof plannedDurationMinutes === 'number'
    ? normalized.filter((minute) => minute <= plannedDurationMinutes)
    : normalized;

  return [...new Set(filtered)].sort((left, right) => left - right);
};

export const getInvalidReminderMarkers = (markers: number[], plannedDurationMinutes?: number): number[] => {
  if (typeof plannedDurationMinutes !== 'number') return [];

  return [...new Set(
    markers
      .filter((minute) => Number.isFinite(minute) && minute > 0)
      .map((minute) => Math.floor(minute))
      .filter((minute) => minute > plannedDurationMinutes)
  )].sort((left, right) => left - right);
};

export const isReminderMarkerAllowed = (minute: number, plannedDurationMinutes?: number): boolean =>
  Number.isFinite(minute) &&
  minute > 0 &&
  (typeof plannedDurationMinutes !== 'number' || minute <= plannedDurationMinutes);
