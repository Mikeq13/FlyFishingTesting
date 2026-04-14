import { getDb, isWeb } from './schema';
import { UserProfile } from '@/types/user';
import { insertWebRow, listWebRows } from './webStore';

const WEB_USERS_KEY = 'fishing_lab.users';
const WEB_USERS_ID_KEY = 'fishing_lab.users.nextId';

export const createUser = async (name: string): Promise<number> => {
  if (isWeb) {
    return insertWebRow<UserProfile>(WEB_USERS_KEY, WEB_USERS_ID_KEY, { name, createdAt: new Date().toISOString() }, { prepend: false });

let memUsers: UserProfile[] = [];
let memId = 1;

export const createUser = async (name: string): Promise<number> => {
  if (isWeb) {
    const id = memId++;
    memUsers.push({ id, name, createdAt: new Date().toISOString() });
    return id;
  }

  const db = await getDb();
  const result = await db.runAsync(`INSERT INTO users (name, created_at) VALUES (?, ?)`, name, new Date().toISOString());
  return result.lastInsertRowId;
};

export const listUsers = async (): Promise<UserProfile[]> => {
  if (isWeb) return listWebRows<UserProfile>(WEB_USERS_KEY);
  if (isWeb) return memUsers;
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM users ORDER BY id ASC');
  return rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at }));
};
