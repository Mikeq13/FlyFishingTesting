export type UserRole = 'owner' | 'angler';
export type AccessLevel = 'free' | 'trial' | 'subscriber' | 'power_user';
export type SubscriptionStatus = 'not_started' | 'trialing' | 'active' | 'expired' | 'power_user';

export interface UserProfile {
  id: number;
  name: string;
  createdAt: string;
  role: UserRole;
  accessLevel: AccessLevel;
  subscriptionStatus: SubscriptionStatus;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  subscriptionExpiresAt?: string | null;
  grantedByUserId?: number | null;
}
