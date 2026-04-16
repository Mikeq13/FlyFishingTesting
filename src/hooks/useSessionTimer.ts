import { useEffect, useMemo, useState } from 'react';
import { normalizeReminderMarkers } from '@/utils/sessionReminders';

const formatDuration = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
};

export const useSessionTimer = ({
  startedAt,
  plannedDurationMinutes,
  alertIntervalMinutes,
  alertMarkersMinutes
}: {
  startedAt: string;
  plannedDurationMinutes?: number;
  alertIntervalMinutes?: number | null;
  alertMarkersMinutes?: number[];
}) => {
  const [now, setNow] = useState(Date.now());
  const [activeAlertMinute, setActiveAlertMinute] = useState<number | null>(null);
  const [triggeredMinutes, setTriggeredMinutes] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const markers = normalizeReminderMarkers(
      alertMarkersMinutes?.length
      ? alertMarkersMinutes
      : typeof alertIntervalMinutes === 'number'
        ? [alertIntervalMinutes]
        : [],
      plannedDurationMinutes
    );
    if (!markers.length) return;
    const elapsedMinutes = Math.floor((Math.max(0, now - new Date(startedAt).getTime()) / 1000) / 60);
    const milestone = markers.find((minute) => minute <= elapsedMinutes && !triggeredMinutes.includes(minute)) ?? null;

    if (milestone && milestone > 0) {
      setTriggeredMinutes((current) => [...current, milestone]);
      setActiveAlertMinute(milestone);
      const timeout = setTimeout(() => setActiveAlertMinute(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [alertIntervalMinutes, alertMarkersMinutes, now, plannedDurationMinutes, startedAt, triggeredMinutes]);

  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const remainingSeconds = typeof plannedDurationMinutes === 'number' ? Math.max(0, plannedDurationMinutes * 60 - elapsedSeconds) : null;

  const nextAlertMinute = useMemo(() => {
    const markers = normalizeReminderMarkers(
      alertMarkersMinutes?.length
      ? [...alertMarkersMinutes].sort((left, right) => left - right)
      : typeof alertIntervalMinutes === 'number'
        ? [alertIntervalMinutes]
        : [],
      plannedDurationMinutes
    );
    if (!markers.length) return null;
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    return markers.find((minute) => minute > elapsedMinutes) ?? null;
  }, [alertIntervalMinutes, alertMarkersMinutes, elapsedSeconds, plannedDurationMinutes]);

  return {
    elapsedSeconds,
    remainingSeconds,
    elapsedLabel: formatDuration(elapsedSeconds),
    remainingLabel: remainingSeconds === null ? null : formatDuration(remainingSeconds),
    activeAlertMinute,
    nextAlertMinute
  };
};
