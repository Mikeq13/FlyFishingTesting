import { Platform } from 'react-native';

export const openDatabaseAsync = async (name: string) => {
  if (Platform.OS === 'web') {
    const mod = await import('./sqlite.web');
    return mod.openDatabaseAsync(name);
  }

  const mod = await import('./sqlite.native');
  return mod.openDatabaseAsync(name);
};
