const fallbackMemory = new Map<string, string>();

const hasLocalStorage = (): boolean => {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
};

const readRaw = (key: string): string | null => {
  if (hasLocalStorage()) {
    return window.localStorage.getItem(key);
  }
  return fallbackMemory.get(key) ?? null;
};

const writeRaw = (key: string, value: string): void => {
  if (hasLocalStorage()) {
    window.localStorage.setItem(key, value);
    return;
  }
  fallbackMemory.set(key, value);
};

export const listWebRows = <T>(tableKey: string): T[] => {
  const raw = readRaw(tableKey);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
};

export const insertWebRow = <T extends { id: number }>(
  tableKey: string,
  counterKey: string,
  payload: Omit<T, 'id'>,
  options: { prepend?: boolean } = { prepend: true }
): number => {
  const rows = listWebRows<T>(tableKey);
  const nextId = Number(readRaw(counterKey) ?? '1');
  const row = { id: nextId, ...payload } as T;

  if (options.prepend === false) {
    rows.push(row);
  } else {
    rows.unshift(row);
  }

  writeRaw(tableKey, JSON.stringify(rows));
  writeRaw(counterKey, String(nextId + 1));
  return nextId;
};
