import { useEffect, useMemo, useState } from 'react';

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
  alertIntervalMinutes
}: {
  startedAt: string;
  plannedDurationMinutes?: number;
  alertIntervalMinutes?: number | null;
}) => {
  const [now, setNow] = useState(Date.now());
  const [activeAlertMinute, setActiveAlertMinute] = useState<number | null>(null);
  const [lastTriggeredMinute, setLastTriggeredMinute] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!alertIntervalMinutes) return;
    const elapsedMinutes = Math.floor((Math.max(0, now - new Date(startedAt).getTime()) / 1000) / 60);
    const milestone = Math.floor(elapsedMinutes / alertIntervalMinutes) * alertIntervalMinutes;

    if (milestone > 0 && milestone !== lastTriggeredMinute) {
      setLastTriggeredMinute(milestone);
      setActiveAlertMinute(milestone);
      const timeout = setTimeout(() => setActiveAlertMinute(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [alertIntervalMinutes, lastTriggeredMinute, now, startedAt]);

  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const remainingSeconds = typeof plannedDurationMinutes === 'number' ? Math.max(0, plannedDurationMinutes * 60 - elapsedSeconds) : null;

  const nextAlertMinute = useMemo(() => {
    if (!alertIntervalMinutes) return null;
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    return Math.ceil((elapsedMinutes + 1) / alertIntervalMinutes) * alertIntervalMinutes;
  }, [alertIntervalMinutes, elapsedSeconds]);

  return {
    elapsedSeconds,
    remainingSeconds,
    elapsedLabel: formatDuration(elapsedSeconds),
    remainingLabel: remainingSeconds === null ? null : formatDuration(remainingSeconds),
    activeAlertMinute,
    nextAlertMinute
  };
};
