import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { OptionChips } from '@/components/OptionChips';
import { useTheme } from '@/design/theme';
import { AuthStatus, RemoteSessionSnapshot, SyncStatusSnapshot } from '@/types/remote';
import { NotificationPermissionStatus, SharedDataStatus } from '@/types/appState';
import { getAppSetting, setAppSetting } from '@/db/settingsRepo';
import { getSyncTrustFeedback } from '@/utils/syncFeedback';
import {
  BETA_READINESS_CHECKS,
  BETA_READINESS_SETTING_KEY,
  getBetaReadinessScore,
  parseBetaReadinessSnapshot
} from '@/utils/betaReadiness';
import { BetaReadinessCheckStatus, BetaReadinessSnapshot } from '@/types/betaReadiness';

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
}) => {
  const { theme } = useTheme();
  const [snapshot, setSnapshot] = React.useState<BetaReadinessSnapshot>(() => parseBetaReadinessSnapshot(null));
  const score = getBetaReadinessScore(snapshot);
  const syncTrustFeedback = React.useMemo(
    () =>
      getSyncTrustFeedback({
        hasRemoteSession: !!remoteSession,
        sharedDataStatus,
        syncStatus,
        scope: 'local_data',
        entityLabel: 'journal'
      }),
    [remoteSession, sharedDataStatus, syncStatus]
  );

  React.useEffect(() => {
    let mounted = true;
    getAppSetting(BETA_READINESS_SETTING_KEY)
      .then((stored) => {
        if (mounted) setSnapshot(parseBetaReadinessSnapshot(stored));
      })
      .catch(console.error);

    return () => {
      mounted = false;
    };
  }, []);

  const persistSnapshot = async (nextSnapshot: BetaReadinessSnapshot) => {
    setSnapshot(nextSnapshot);
    await setAppSetting(BETA_READINESS_SETTING_KEY, JSON.stringify(nextSnapshot));
  };

  const updateCheckStatus = (key: string, status: BetaReadinessCheckStatus) => {
    persistSnapshot({
      ...snapshot,
      checks: {
        ...snapshot.checks,
        [key]: status
      }
    }).catch(console.error);
  };

  const recordOwnerPass = () => {
    persistSnapshot({
      ...snapshot,
      testedAt: new Date().toISOString()
    }).catch(console.error);
  };

  return (
  <SectionCard
    title="Beta Readiness"
    subtitle="Use this as the owner-device gate before inviting more testers. A build is not trusted until the live checks pass on Android."
    tone="light"
  >
    <StatusBanner
      tone={score.passed === score.total ? 'success' : score.followUps ? 'warning' : 'info'}
      text={`Native Beta: ${score.passed}/${score.total} checks passed${score.followUps ? `, ${score.followUps} follow-up${score.followUps === 1 ? '' : 's'}` : ''}.`}
    />
    <View style={{ gap: 8 }}>
      <Text style={{ color: theme.colors.textDark, fontWeight: '800' }}>Build Tested</Text>
      <TextInput
        value={snapshot.buildLabel}
        onChangeText={(value) => {
          const nextSnapshot = { ...snapshot, buildLabel: value };
          setSnapshot(nextSnapshot);
          setAppSetting(BETA_READINESS_SETTING_KEY, JSON.stringify(nextSnapshot)).catch(console.error);
        }}
        placeholder="Android debug APK or preview build"
        placeholderTextColor={theme.colors.inputPlaceholder}
        style={{
          borderWidth: 1,
          borderColor: theme.colors.borderLight,
          borderRadius: theme.radius.md,
          padding: theme.spacing.md,
          color: theme.colors.inputText,
          backgroundColor: theme.colors.inputBg
        }}
      />
      <TextInput
        value={snapshot.tester}
        onChangeText={(value) => {
          const nextSnapshot = { ...snapshot, tester: value };
          setSnapshot(nextSnapshot);
          setAppSetting(BETA_READINESS_SETTING_KEY, JSON.stringify(nextSnapshot)).catch(console.error);
        }}
        placeholder="Owner or tester name"
        placeholderTextColor={theme.colors.inputPlaceholder}
        style={{
          borderWidth: 1,
          borderColor: theme.colors.borderLight,
          borderRadius: theme.radius.md,
          padding: theme.spacing.md,
          color: theme.colors.inputText,
          backgroundColor: theme.colors.inputBg
        }}
      />
      <InlineSummaryRow
        label="Last Owner Pass"
        value={snapshot.testedAt ? new Date(snapshot.testedAt).toLocaleString() : 'Not recorded yet'}
        valueMuted={!snapshot.testedAt}
        tone="light"
      />
      <AppButton label="Record Owner Pass Timestamp" onPress={recordOwnerPass} variant="secondary" surfaceTone="light" />
    </View>
    <InlineSummaryRow
      label="Account State"
      value={
        remoteSession
          ? 'Signed in'
          : authStatus === 'authenticating'
            ? 'Finishing sign-in'
            : authStatus === 'pending_verification'
              ? 'Waiting on email step'
              : 'Sign-in required'
      }
      tone="light"
    />
    <InlineSummaryRow
      label="Shared Data"
      value={
        sharedDataStatus === 'ready'
          ? 'Shared backend ready'
          : sharedDataStatus === 'loading'
            ? 'Syncing to shared backend'
            : sharedDataStatus === 'error'
              ? 'Shared backend unavailable'
              : 'Saved locally'
      }
      tone="light"
    />
    <InlineSummaryRow
      label="Sync Queue"
      value={syncStatus.pendingCount ? `${syncStatus.pendingCount} changes waiting to sync` : 'No pending local changes'}
      tone="light"
    />
    {syncTrustFeedback ? <StatusBanner tone={syncTrustFeedback.tone} text={syncTrustFeedback.text} /> : null}
    {syncStatus.failureSummaries.length ? (
      <StatusBanner
        tone="warning"
        text={
          syncStatus.failureSummaries.some((failure) => failure.category === 'schema' || failure.category === 'permission')
            ? 'Migration or policy fix needed before shared beta sync can be trusted.'
            : `${syncStatus.failureSummaries.length} sync issue${syncStatus.failureSummaries.length === 1 ? '' : 's'} need review before tester expansion.`
        }
      />
    ) : null}
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
    <View style={{ gap: 10 }}>
      {BETA_READINESS_CHECKS.map((check) => (
        <View
          key={check.key}
          style={{
            gap: 6,
            backgroundColor: theme.colors.nestedSurface,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.nestedSurfaceBorder,
            padding: theme.spacing.md
          }}
        >
          <Text style={{ color: theme.colors.textDark, fontWeight: '800' }}>{check.label}</Text>
          <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 19 }}>{check.description}</Text>
          <OptionChips
            label="Status"
            options={['untested', 'follow_up', 'pass'] as const}
            value={snapshot.checks[check.key] ?? 'untested'}
            onChange={(value) => updateCheckStatus(check.key, value as BetaReadinessCheckStatus)}
          />
        </View>
      ))}
    </View>
    <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>
      If a check fails, fix the behavior before expanding beyond the owner-device pass. Treat refresh or relaunch mismatches as trust bugs.
    </Text>
  </SectionCard>
  );
};
