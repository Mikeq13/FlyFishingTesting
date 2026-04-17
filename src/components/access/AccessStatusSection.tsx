import React from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { PREMIUM_MONTHLY_PRICE_LABEL, PREMIUM_TRIAL_LABEL } from '@/billing/storekit';
import { AppButton } from '@/components/ui/AppButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { ActionGroup } from '@/components/ui/ActionGroup';
import { FormField, getFormInputStyle } from '@/components/ui/FormField';
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
  authEmail,
  onAuthEmailChange,
  onSendMagicLink,
  onSignOut,
  onSyncNow,
  showPremiumActions,
  onStartTrial,
  onContinueWithApple,
  currentUserRole
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
  authEmail: string;
  onAuthEmailChange: (value: string) => void;
  onSendMagicLink: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onSyncNow: () => Promise<void>;
  showPremiumActions: boolean;
  onStartTrial: () => Promise<void>;
  onContinueWithApple: () => Promise<void>;
  currentUserRole: string;
}) => {
  const { theme } = useTheme();
  const formInputStyle = getFormInputStyle();

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
    {authStatus === 'authenticating' && !remoteSession ? (
      <StatusBanner tone="info" text="Magic link sent. Open it on this device to finish sign-in. If the app was interrupted, come back here and send a fresh link." />
    ) : null}
    {syncStatus.lastError ? <StatusBanner tone="error" text={`Last sync issue: ${syncStatus.lastError}`} /> : null}
    {notificationPermissionStatus === 'denied' ? <StatusBanner tone="warning" text="Notifications are blocked on this device. Session reminders will stay in-app until phone notification access is re-enabled." /> : null}
    <Text style={{ color: theme.colors.textDarkSoft }}>
      Plan: {PREMIUM_MONTHLY_PRICE_LABEL} with a {PREMIUM_TRIAL_LABEL.toLowerCase()}
    </Text>
    <StatusBanner
      tone="info"
      text={
        currentUserRole === 'owner'
          ? 'You are on the local owner profile, so owner controls stay available while signed in.'
          : 'Signing into the shared beta does not change this angler into an owner. Owner controls stay tied to the local owner profile.'
      }
    />
    <ActionGroup>
      <FormField label="Shared Beta Email" tone="light">
        <TextInput value={authEmail} onChangeText={onAuthEmailChange} placeholder="angler@email.com" placeholderTextColor={theme.colors.inputPlaceholder} autoCapitalize="none" keyboardType="email-address" style={formInputStyle} />
      </FormField>
      <AppButton label={authStatus === 'authenticating' ? 'Sending Magic Link...' : 'Send Magic Link'} onPress={() => { onSendMagicLink().then(() => Alert.alert('Magic link sent', 'Check your email on this device and open the link to finish signing in.')).catch((error) => Alert.alert('Unable to start sign-in', error instanceof Error ? error.message : 'Please try again.')); }} disabled={authStatus === 'authenticating'} />
      {remoteSession ? <AppButton label="Sign Out of Shared Beta" onPress={() => { onSignOut().then(() => Alert.alert('Signed out', 'Shared beta sync is now disconnected on this device.')).catch((error) => Alert.alert('Unable to sign out', error instanceof Error ? error.message : 'Please try again.')); }} variant="danger" /> : null}
      <AppButton label="Sync Now" onPress={() => { onSyncNow().then(() => Alert.alert('Sync complete', 'Pending shared records were pushed to Supabase.')).catch((error) => Alert.alert('Unable to sync now', error instanceof Error ? error.message : 'Please try again.')); }} variant="tertiary" />
    </ActionGroup>
    {showPremiumActions ? (
      <>
        <AppButton label="Start 7-Day Trial" onPress={() => { onStartTrial().catch(console.error); }} />
        <AppButton label="Continue With Apple Subscription" onPress={() => { onContinueWithApple().catch(console.error); }} variant="secondary" />
      </>
    ) : null}
  </SectionCard>
  );
};
