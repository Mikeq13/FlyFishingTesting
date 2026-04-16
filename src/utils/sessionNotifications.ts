import { Platform } from 'react-native';
import { Session } from '@/types/session';
import { deleteAppSetting, getAppSetting, setAppSetting } from '@/db/settingsRepo';
import { normalizeReminderMarkers } from './sessionReminders';

const SESSION_NOTIFICATION_KEY_PREFIX = 'session_notification_ids';

const getSessionNotificationKey = (sessionId: number) => `${SESSION_NOTIFICATION_KEY_PREFIX}.${sessionId}`;

const isNativeNotificationsAvailable = () => Platform.OS !== 'web';

const loadNotificationsModule = async () => {
  if (!isNativeNotificationsAvailable()) return null;
  try {
    return await import('expo-notifications');
  } catch (error) {
    console.warn('Notifications unavailable', error);
    return null;
  }
};

const readStoredNotificationIds = async (sessionId: number): Promise<string[]> => {
  const raw = await getAppSetting(getSessionNotificationKey(sessionId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
};

const writeStoredNotificationIds = async (sessionId: number, ids: string[]) => {
  if (!ids.length) {
    await deleteAppSetting(getSessionNotificationKey(sessionId));
    return;
  }
  await setAppSetting(getSessionNotificationKey(sessionId), JSON.stringify(ids));
};

export const ensureNotificationHandler = async (): Promise<void> => {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true
    })
  });
};

export const ensureNotificationPermissions = async (): Promise<boolean> => {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) return false;

  const existingPermissions = await Notifications.getPermissionsAsync();
  if (existingPermissions.granted || existingPermissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const nextPermissions = await Notifications.requestPermissionsAsync();
  return nextPermissions.granted || nextPermissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
};

export const cancelSessionNotifications = async (sessionId: number): Promise<void> => {
  const Notifications = await loadNotificationsModule();
  const ids = await readStoredNotificationIds(sessionId);

  if (Notifications && ids.length) {
    await Promise.all(ids.map((identifier) => Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined)));
  }

  await writeStoredNotificationIds(sessionId, []);
};

export const scheduleSessionNotifications = async (session: Session): Promise<void> => {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) return;
  if (session.mode === 'experiment' || session.endedAt) return;

  const hasPermission = await ensureNotificationPermissions();
  if (!hasPermission) return;

  await cancelSessionNotifications(session.id);

  const startedAtMs = new Date(session.startAt ?? session.date).getTime();
  const nowMs = Date.now();
  const plannedDurationMinutes =
    session.plannedDurationMinutes ??
    (session.startAt && session.endAt
      ? Math.max(0, Math.round((new Date(session.endAt).getTime() - new Date(session.startAt).getTime()) / 60000))
      : undefined);
  const elapsedMinutes = Math.max(0, Math.floor((nowMs - startedAtMs) / 60000));
  const markers = normalizeReminderMarkers(session.alertMarkersMinutes ?? [], plannedDurationMinutes).filter(
    (minute) => minute > elapsedMinutes
  );

  if (!markers.length) return;

  const identifiers: string[] = [];

  for (const minute of markers) {
    const secondsUntilTrigger = Math.max(1, minute * 60 - Math.floor((nowMs - startedAtMs) / 1000));
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: session.mode === 'competition' ? 'Competition reminder' : 'Practice reminder',
        body: `${minute} minutes into your ${session.mode} session.`,
        sound: session.notificationSoundEnabled === false ? false : 'default',
        data: {
          sessionId: session.id,
          sessionMode: session.mode,
          minute
        }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilTrigger
      }
    });
    identifiers.push(identifier);
  }

  await writeStoredNotificationIds(session.id, identifiers);
};
