import { Platform } from 'react-native';

export const PREMIUM_MONTHLY_PRODUCT_ID = 'com.fishinglab.premium.monthly';
export const PREMIUM_MONTHLY_PRICE_LABEL = '$3.99/month';
export const PREMIUM_TRIAL_LABEL = '7-day free trial';

export type StoreKitPurchaseResult =
  | { ok: true; message: string }
  | { ok: false; reason: string };

export const canAttemptApplePurchase = (): boolean => Platform.OS === 'ios';

export const beginAppleSubscriptionPurchase = async (): Promise<StoreKitPurchaseResult> => {
  if (Platform.OS !== 'ios') {
    return { ok: false, reason: 'Apple subscriptions can only be purchased on iPhone or iPad builds.' };
  }

  return {
    ok: false,
    reason: 'StoreKit purchase wiring is scaffolded, but this build still needs the native in-app purchase module added before Apple checkout can run.'
  };
};
