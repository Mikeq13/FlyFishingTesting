const fallbackMemory = new Map<string, string>();

const hasLocalStorage = (): boolean => {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
};

export const readWebValue = (key: string): string | null => {
  if (hasLocalStorage()) {
    return window.localStorage.getItem(key);
  }
  return fallbackMemory.get(key) ?? null;
};

export const writeWebValue = (key: string, value: string): void => {
  if (hasLocalStorage()) {
    window.localStorage.setItem(key, value);
    return;
  }
  fallbackMemory.set(key, value);
};

export const clearWebValuesByPrefix = (prefix: string): void => {
  if (hasLocalStorage()) {
    const keysToDelete: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => window.localStorage.removeItem(key));
  }

  for (const key of Array.from(fallbackMemory.keys())) {
    if (key.startsWith(prefix)) {
      fallbackMemory.delete(key);
    }
  }
};

export const listWebRows = <T>(tableKey: string): T[] => {
  const raw = readWebValue(tableKey);
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
  const nextId = Number(readWebValue(counterKey) ?? '1');
  const row = { id: nextId, ...payload } as T;

  if (options.prepend === false) {
    rows.push(row);
  } else {
    rows.unshift(row);
  }

  writeWebValue(tableKey, JSON.stringify(rows));
  writeWebValue(counterKey, String(nextId + 1));
  return nextId;
};

export const updateWebRows = <T>(tableKey: string, updater: (rows: T[]) => T[]): void => {
  const rows = listWebRows<T>(tableKey);
  writeWebValue(tableKey, JSON.stringify(updater(rows)));
};

export const deleteWebRows = <T>(tableKey: string, predicate: (row: T) => boolean): void => {
  const rows = listWebRows<T>(tableKey);
  writeWebValue(
    tableKey,
    JSON.stringify(rows.filter((row) => !predicate(row)))
  );
};
