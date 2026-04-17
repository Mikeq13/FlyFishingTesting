import React from 'react';
import { Text } from 'react-native';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { AuthStatus, RemoteSessionSnapshot, SyncStatusSnapshot } from '@/types/remote';
import { NotificationPermissionStatus, SharedDataStatus } from '@/types/appState';

export const BetaReadinessSection = ({
  authStatus,
  remoteSession,
  sharedDataStatus,
  syncStatus,
  notificationPermissionStatus
}: {
  authStatus: AuthStatus;
  remoteSession?: RemoteSessionSnapshot | null;
  sharedDataStatus: SharedDataStatus;
  syncStatus: SyncStatusSnapshot;
  notificationPermissionStatus: NotificationPermissionStatus;
}) => (
  <SectionCard
    title="Beta Readiness"
    subtitle="Use this as the quick trust check before assuming shared data, reminders, or competition assignments are fully live."
    tone="light"
  >
    <InlineSummaryRow
      label="Account State"
      value={remoteSession ? 'Signed in to shared beta' : authStatus === 'authenticating' ? 'Finishing sign-in' : 'Local-only mode'}
      tone="light"
    />
    <InlineSummaryRow
      label="Shared Data"
      value={
        sharedDataStatus === 'ready'
          ? 'Loaded from backend'
          : sharedDataStatus === 'loading'
            ? 'Still loading'
            : sharedDataStatus === 'error'
              ? 'Needs retry'
              : 'Local-only cache'
      }
      tone="light"
    />
    <InlineSummaryRow
      label="Sync Queue"
      value={syncStatus.pendingCount ? `${syncStatus.pendingCount} changes waiting to sync` : 'No pending local changes'}
      tone="light"
    />
    <InlineSummaryRow
      label="Phone Alerts"
      value={
        notificationPermissionStatus === 'denied'
          ? 'Device reminders are blocked'
          : notificationPermissionStatus === 'granted' || notificationPermissionStatus === 'provisional'
            ? 'Allowed on this device'
            : notificationPermissionStatus === 'unsupported'
              ? 'Not supported in this build'
              : 'Permission not checked yet'
      }
      tone="light"
    />
    {!remoteSession ? (
      <StatusBanner tone="info" text="Expo Go is still fine for solo iteration, but shared auth return, deep links, and final reminder behavior still need a native dev build or TestFlight." />
    ) : null}
    {sharedDataStatus === 'error' ? (
      <StatusBanner
        tone="error"
        text={
          syncStatus.lastError
            ? `Shared data hit a beta sync issue: ${syncStatus.lastError}`
            : 'Shared data could not load. Retry sync before assuming invites, assignments, or shared practice data are current.'
        }
      />
    ) : null}
    <Text style={{ color: '#486581' }}>
      If something looks missing, check sign-in first, then Sync Now, then confirm the other angler actually accepted the invite or joined the competition from their own device.
    </Text>
  </SectionCard>
);
