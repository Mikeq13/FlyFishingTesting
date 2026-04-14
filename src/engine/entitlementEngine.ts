import { UserProfile } from '@/types/user';

export const PREMIUM_TRIAL_DAYS = 7;

const addDays = (iso: string, days: number): string => {
  const date = new Date(iso);
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

export const createTrialWindow = (startedAt = new Date().toISOString()) => ({
  trialStartedAt: startedAt,
  trialEndsAt: addDays(startedAt, PREMIUM_TRIAL_DAYS)
});

export const hasPremiumAccess = (user?: UserProfile | null, nowIso = new Date().toISOString()): boolean => {
  if (!user) return false;
  if (user.role === 'owner' || user.accessLevel === 'power_user') return true;
  if (user.accessLevel === 'subscriber' && user.subscriptionStatus === 'active') {
    return !user.subscriptionExpiresAt || user.subscriptionExpiresAt > nowIso;
  }
  if (user.accessLevel === 'trial' && user.subscriptionStatus === 'trialing') {
    return !!user.trialEndsAt && user.trialEndsAt > nowIso;
  }
  return false;
};

export const getEntitlementLabel = (user?: UserProfile | null, nowIso = new Date().toISOString()): string => {
  if (!user) return 'No access';
  if (user.role === 'owner') return 'Owner access';
  if (user.accessLevel === 'power_user') return 'Power user';
  if (user.accessLevel === 'subscriber' && user.subscriptionStatus === 'active') return 'Subscriber';
  if (user.accessLevel === 'trial' && user.subscriptionStatus === 'trialing' && user.trialEndsAt) {
    const ends = new Date(user.trialEndsAt);
    const now = new Date(nowIso);
    const days = Math.max(0, Math.ceil((ends.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    return `Trial active (${days} day${days === 1 ? '' : 's'} left)`;
  }
  return 'Free access';
};
