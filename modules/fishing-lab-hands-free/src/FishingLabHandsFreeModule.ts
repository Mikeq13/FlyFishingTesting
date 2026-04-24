import { requireNativeModule } from 'expo';
import { WatchCompanionStatus } from '../../../src/types/handsFree';

type FishingLabHandsFreeModuleType = {
  consumePendingCommand(): Promise<string | null>;
  syncActiveOuting(serializedOuting: string | null): Promise<void>;
  syncHandsFreePreferences(serializedPreferences: string): Promise<void>;
  getWatchCompanionStatus(): Promise<WatchCompanionStatus>;
};

export default requireNativeModule<FishingLabHandsFreeModuleType>('FishingLabHandsFree');
