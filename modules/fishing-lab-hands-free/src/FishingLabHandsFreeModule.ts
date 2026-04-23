import { requireNativeModule } from 'expo';

type FishingLabHandsFreeModuleType = {
  consumePendingCommand(): Promise<string | null>;
};

export default requireNativeModule<FishingLabHandsFreeModuleType>('FishingLabHandsFree');
