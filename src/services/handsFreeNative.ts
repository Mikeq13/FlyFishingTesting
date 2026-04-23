import { Platform } from 'react-native';

type NativeHandsFreeModule = {
  consumePendingCommand: () => Promise<string | null>;
};

let cachedModule: NativeHandsFreeModule | null | undefined;

const getNativeModule = (): NativeHandsFreeModule | null => {
  if (Platform.OS !== 'ios') return null;
  if (cachedModule !== undefined) return cachedModule;

  try {
    cachedModule = require('../../modules/fishing-lab-hands-free').default as NativeHandsFreeModule;
  } catch (error) {
    cachedModule = null;
  }

  return cachedModule;
};

export const consumePendingHandsFreeNativeCommand = async (): Promise<string | null> => {
  const nativeModule = getNativeModule();
  if (!nativeModule) return null;
  return nativeModule.consumePendingCommand();
};
