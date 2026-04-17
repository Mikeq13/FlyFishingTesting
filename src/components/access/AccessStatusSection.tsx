import React from 'react';
import { Text, View } from 'react-native';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { useTheme } from '@/design/theme';
import { SyncStatusSnapshot, RemoteSessionSnapshot, AuthStatus } from '@/types/remote';
import { NotificationPermissionStatus, SharedDataStatus } from '@/types/appState';

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

  return (
  <SectionCard title="Current Access" subtitle="Your sync state, remote sign-in, and subscription tools live here." tone="light">
    <Text style={{ color: theme.colors.textDark, fontWeight: '800', fontSize: 22 }}>{currentUserName}</Text>
    <View
      style={{
        gap: 8,
        backgroundColor: theme.colors.nestedSurface,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.colors.nestedSurfaceBorder
      }}
    >
      <InlineSummaryRow label="Status" value={currentEntitlementLabel} tone="light" />
      <InlineSummaryRow label="Premium Features" value={currentHasPremiumAccess ? 'Enabled' : 'Locked'} tone="light" />
      <InlineSummaryRow label="Sync Queue" value={`${syncStatus.pendingCount} pending, ${syncStatus.syncedCount} synced`} tone="light" />
      <InlineSummaryRow label="Sync State" value={syncStatus.state} tone="light" />
      <InlineSummaryRow label="Shared Data" value={sharedDataStatus} tone="light" />
      <InlineSummaryRow label="Remote Auth" value={remoteSession?.email ?? 'Not signed in'} valueMuted={!remoteSession?.email} tone="light" />
      <InlineSummaryRow label="Shared Sync" value={isSyncEnabled ? 'Enabled' : 'Waiting for sign-in or env setup'} valueMuted={!isSyncEnabled} tone="light" />
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
    <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>
      Shared sync, invites, competitions, and tester sponsorship now belong to the signed-in account instead of an anonymous local profile.
    </Text>
  </SectionCard>
  );
};
