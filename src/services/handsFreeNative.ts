import { Platform } from 'react-native';
import { requireNativeModule } from 'expo';
import { ActiveOuting, HandsFreePreferences, WatchCompanionStatus } from '@/types/handsFree';
import { serializeActiveOuting, serializeHandsFreePreferences } from '@/utils/handsFree';

type NativeHandsFreeModule = {
  consumePendingCommand: () => Promise<string | null>;
  syncActiveOuting: (serializedOuting: string | null) => Promise<void>;
  syncHandsFreePreferences: (serializedPreferences: string) => Promise<void>;
  getWatchCompanionStatus: () => Promise<WatchCompanionStatus>;
};

let cachedModule: NativeHandsFreeModule | null | undefined;

const getNativeModule = (): NativeHandsFreeModule | null => {
  if (Platform.OS !== 'ios') return null;
  if (cachedModule !== undefined) return cachedModule;

  try {
    cachedModule = requireNativeModule<NativeHandsFreeModule>('FishingLabHandsFree');
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

export const syncHandsFreeActiveOutingNative = async (outing: ActiveOuting | null): Promise<void> => {
  const nativeModule = getNativeModule();
  if (!nativeModule) return;
  await nativeModule.syncActiveOuting(serializeActiveOuting(outing));
};

export const syncHandsFreePreferencesNative = async (preferences: HandsFreePreferences): Promise<void> => {
  const nativeModule = getNativeModule();
  if (!nativeModule) return;
  await nativeModule.syncHandsFreePreferences(serializeHandsFreePreferences(preferences));
};

export const getWatchCompanionStatusNative = async (): Promise<WatchCompanionStatus> => {
  const nativeModule = getNativeModule();
  if (!nativeModule) {
    return {
      isSupported: false,
      isPaired: false,
      isWatchAppInstalled: false,
      isReachable: false,
      activationState: 'unknown'
    };
  }
  return nativeModule.getWatchCompanionStatus();
};
