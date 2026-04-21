import React from 'react';
import { Text, View } from 'react-native';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { useTheme } from '@/design/theme';
import { SyncStatusSnapshot, RemoteSessionSnapshot, AuthStatus } from '@/types/remote';
import { NotificationPermissionStatus, SharedDataStatus } from '@/types/appState';
import { hasSupabaseConfig } from '@/services/supabaseClient';

export const AccessStatusSection = ({
  currentUserName,
  currentEntitlementLabel,
  currentHasPremiumAccess,
  syncStatus,
  sharedDataStatus,
  notificationPermissionStatus,
  remoteSession,
  isSyncEnabled,
  authStatus,
  currentUserRole,
  ownerIdentityLinked,
  isAuthenticatedOwner
}: {
  currentUserName: string;
  currentEntitlementLabel: string;
  currentHasPremiumAccess: boolean;
  syncStatus: SyncStatusSnapshot;
  sharedDataStatus: SharedDataStatus;
  notificationPermissionStatus: NotificationPermissionStatus;
  remoteSession: RemoteSessionSnapshot | null;
  isSyncEnabled: boolean;
  authStatus: AuthStatus;
  currentUserRole: string;
  ownerIdentityLinked: boolean;
  isAuthenticatedOwner: boolean;
}) => {
  const { theme } = useTheme();
  const isDaylightTheme = theme.id === 'daylight_light';
  const elevatedTextColor = isDaylightTheme ? theme.colors.textDark : theme.colors.text;
  const elevatedSoftTextColor = isDaylightTheme ? theme.colors.textDarkSoft : theme.colors.textSoft;
  const elevatedSurface = isDaylightTheme ? theme.colors.nestedSurface : theme.colors.surfaceAlt;
  const elevatedBorder = isDaylightTheme ? theme.colors.nestedSurfaceBorder : theme.colors.borderStrong;

  return (
  <SectionCard title="Billing & Access" subtitle="Your sync state, remote sign-in, and account access details live here." tone="light">
    <Text style={{ color: elevatedTextColor, fontWeight: '800', fontSize: 22 }}>{currentUserName}</Text>
    <View
      style={{
        gap: 8,
        backgroundColor: elevatedSurface,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: elevatedBorder
      }}
    >
      <InlineSummaryRow label="Status" value={currentEntitlementLabel} tone="light" />
      <InlineSummaryRow label="Premium Features" value={currentHasPremiumAccess ? 'Enabled' : 'Locked'} tone="light" />
      <InlineSummaryRow label="Sync Queue" value={`${syncStatus.pendingCount} pending, ${syncStatus.syncedCount} synced`} tone="light" />
      <InlineSummaryRow label="Sync State" value={syncStatus.state} tone="light" />
      <InlineSummaryRow label="Shared Data" value={sharedDataStatus} tone="light" />
      <InlineSummaryRow label="Remote Auth" value={remoteSession?.email ?? 'Not signed in'} valueMuted={!remoteSession?.email} tone="light" />
      <InlineSummaryRow label="Shared Sync" value={isSyncEnabled ? 'Enabled' : hasSupabaseConfig ? 'Waiting for sign-in' : 'Cloud setup missing'} valueMuted={!isSyncEnabled} tone="light" />
      <InlineSummaryRow label="Notifications" value={notificationPermissionStatus} valueMuted={notificationPermissionStatus !== 'granted' && notificationPermissionStatus !== 'provisional'} tone="light" />
      <InlineSummaryRow label="Last Sync" value={syncStatus.lastSyncedAt ? new Date(syncStatus.lastSyncedAt).toLocaleString() : 'Not synced yet'} valueMuted={!syncStatus.lastSyncedAt} tone="light" />
    </View>
    {authStatus === 'pending_verification' ? <StatusBanner tone="info" text="Your account is waiting on an email step. Finish verification or recovery from your inbox, then return here." /> : null}
    {syncStatus.lastError ? <StatusBanner tone="error" text={`Last sync issue: ${syncStatus.lastError}`} /> : null}
    {notificationPermissionStatus === 'denied' ? <StatusBanner tone="warning" text="Notifications are blocked on this device. Session reminders will stay in-app until phone notification access is re-enabled." /> : null}
    <StatusBanner
      tone="info"
      text={
        currentUserRole === 'owner'
          ? isAuthenticatedOwner
            ? 'Owner tools are unlocked because the owner profile is signed in with its linked owner account.'
            : ownerIdentityLinked
              ? 'This is the owner profile, but owner tools stay locked until the linked owner account is the one signed in.'
              : 'This is the owner profile, but owner tools stay locked until you link this profile to your owner account.'
          : 'Signing in enables shared sync, but it does not turn this angler into an owner or grant admin access.'
      }
    />
    <Text style={{ color: elevatedSoftTextColor, lineHeight: 20 }}>
      Shared sync, invites, competitions, and tester sponsorship belong to the signed-in account instead of a generic local profile.
    </Text>
  </SectionCard>
  );
};
