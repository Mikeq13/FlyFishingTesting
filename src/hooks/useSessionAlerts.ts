import { useEffect } from 'react';
import { Vibration } from 'react-native';
import { Session } from '@/types/session';
import { cancelSessionNotifications, scheduleSessionNotifications } from '@/utils/sessionNotifications';

export const useSessionAlerts = (session: Session | null, activeAlertMinute: number | null) => {
  useEffect(() => {
    if (!session) return;
    if (session.endedAt) {
      cancelSessionNotifications(session.id).catch(console.error);
      return;
    }
    scheduleSessionNotifications(session).catch(console.error);
  }, [session]);

  useEffect(() => {
    if (!activeAlertMinute || session?.notificationVibrationEnabled === false) return;
    Vibration.vibrate(400);
  }, [activeAlertMinute, session?.notificationVibrationEnabled]);
};
