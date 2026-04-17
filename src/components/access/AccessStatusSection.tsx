import React from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { PREMIUM_MONTHLY_PRICE_LABEL, PREMIUM_TRIAL_LABEL } from '@/billing/storekit';
import { AppButton } from '@/components/ui/AppButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { ActionGroup } from '@/components/ui/ActionGroup';
import { FormField, formInputStyle } from '@/components/ui/FormField';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { SyncStatusSnapshot, RemoteSessionSnapshot, AuthStatus } from '@/types/remote';

export const AccessStatusSection = ({
  currentUserName,
  currentEntitlementLabel,
  currentHasPremiumAccess,
  syncStatus,
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
  onContinueWithApple
}: {
  currentUserName: string;
  currentEntitlementLabel: string;
  currentHasPremiumAccess: boolean;
  syncStatus: SyncStatusSnapshot;
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
}) => (
  <SectionCard title="Current Access" subtitle="Your sync state, remote sign-in, and subscription tools live here.">
    <Text style={{ color: '#f7fdff', fontWeight: '800', fontSize: 22 }}>{currentUserName}</Text>
    <View style={{ gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 12 }}>
      <InlineSummaryRow label="Status" value={currentEntitlementLabel} />
      <InlineSummaryRow label="Premium Features" value={currentHasPremiumAccess ? 'Enabled' : 'Locked'} />
      <InlineSummaryRow label="Sync Queue" value={`${syncStatus.pendingCount} pending, ${syncStatus.syncedCount} synced`} />
      <InlineSummaryRow label="Sync State" value={syncStatus.state} />
      <InlineSummaryRow label="Remote Auth" value={remoteSession?.email ?? 'Not signed in'} valueMuted={!remoteSession?.email} />
      <InlineSummaryRow label="Shared Sync" value={isSyncEnabled ? 'Enabled' : 'Waiting for sign-in or env setup'} valueMuted={!isSyncEnabled} />
      <InlineSummaryRow label="Last Sync" value={syncStatus.lastSyncedAt ? new Date(syncStatus.lastSyncedAt).toLocaleString() : 'Not synced yet'} valueMuted={!syncStatus.lastSyncedAt} />
    </View>
    {syncStatus.lastError ? <StatusBanner tone="error" text={`Last sync issue: ${syncStatus.lastError}`} /> : null}
    <Text style={{ color: '#d7f3ff' }}>
      Plan: {PREMIUM_MONTHLY_PRICE_LABEL} with a {PREMIUM_TRIAL_LABEL.toLowerCase()}
    </Text>
    <ActionGroup>
      <FormField label="Shared Beta Email">
        <TextInput value={authEmail} onChangeText={onAuthEmailChange} placeholder="angler@email.com" placeholderTextColor="#5a6c78" autoCapitalize="none" keyboardType="email-address" style={formInputStyle} />
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
