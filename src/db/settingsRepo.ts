import { getDb, isWeb } from './schema';
import { readWebValue, writeWebValue } from './webStore';

const WEB_ACTIVE_USER_KEY = 'fishing_lab.settings.activeUserId';
const ACTIVE_USER_SETTING_KEY = 'active_user_id';

export const getActiveUserId = async (): Promise<number | null> => {
  if (isWeb) {
    const raw = readWebValue(WEB_ACTIVE_USER_KEY);
    return raw ? Number(raw) : null;
  }

  const db = await getDb();
  const rows = await db.getAllAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ? LIMIT 1',
    ACTIVE_USER_SETTING_KEY
  );
  const raw = rows[0]?.value;
  return raw ? Number(raw) : null;
};

export const setActiveUserId = async (userId: number): Promise<void> => {
  if (isWeb) {
    writeWebValue(WEB_ACTIVE_USER_KEY, String(userId));
    return;
  }

  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`,
    ACTIVE_USER_SETTING_KEY,
    String(userId)
  );
};
