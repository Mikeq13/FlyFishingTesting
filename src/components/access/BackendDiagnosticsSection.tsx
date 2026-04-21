import React from 'react';
import { Text, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { useTheme } from '@/design/theme';
import { BackendDiagnosticsSnapshot } from '@/types/remote';
import { describeSyncFailureCategory } from '@/services/syncDiagnosticsService';

export const BackendDiagnosticsSection = ({
  diagnostics,
  onRetryBootstrap,
  onRetrySync,
  embedded = false
}: {
  diagnostics: BackendDiagnosticsSnapshot;
  onRetryBootstrap: () => Promise<void>;
  onRetrySync: () => Promise<void>;
  embedded?: boolean;
}) => {
  const { theme } = useTheme();
  const isDaylightTheme = theme.id === 'daylight_light';
  const elevatedTextColor = isDaylightTheme ? theme.colors.textDark : theme.colors.text;
  const elevatedSoftTextColor = isDaylightTheme ? theme.colors.textDarkSoft : theme.colors.textSoft;
  const elevatedSurface = isDaylightTheme ? theme.colors.nestedSurface : theme.colors.surfaceAlt;
  const elevatedBorder = isDaylightTheme ? theme.colors.nestedSurfaceBorder : theme.colors.borderStrong;
  const content = (
    <>
      <View
        style={{
          gap: 8,
          backgroundColor: elevatedSurface,
          borderRadius: theme.radius.md,
          padding: 12,
          borderWidth: 1,
          borderColor: elevatedBorder
        }}
      >
        <InlineSummaryRow label="Backend Project" value={diagnostics.projectHost ?? 'Missing project URL'} valueMuted={!diagnostics.projectHost} tone="light" />
        <InlineSummaryRow label="Auth Connection" value={diagnostics.authConnected ? 'Signed in' : 'Not signed in'} valueMuted={!diagnostics.authConnected} tone="light" />
        <InlineSummaryRow label="Schema Status" value={diagnostics.schema.status} valueMuted={diagnostics.schema.status !== 'compatible'} tone="light" />
        <InlineSummaryRow label="Shared Bootstrap" value={diagnostics.bootstrapState} valueMuted={diagnostics.bootstrapState !== 'ready'} tone="light" />
        <InlineSummaryRow label="Shared Data" value={diagnostics.sharedDataStatus} valueMuted={diagnostics.sharedDataStatus !== 'ready'} tone="light" />
        <InlineSummaryRow label="Sync Queue" value={`${diagnostics.syncStatus.pendingCount} pending | ${diagnostics.syncStatus.failedCount} failed`} valueMuted={!!diagnostics.syncStatus.pendingCount || !!diagnostics.syncStatus.failedCount} tone="light" />
        <InlineSummaryRow label="Last Sync" value={diagnostics.syncStatus.lastSyncedAt ? new Date(diagnostics.syncStatus.lastSyncedAt).toLocaleString() : 'No successful sync yet'} valueMuted={!diagnostics.syncStatus.lastSyncedAt} tone="light" />
        <InlineSummaryRow label="Env Config" value={diagnostics.env.message} valueMuted={diagnostics.env.status !== 'valid'} tone="light" />
      </View>

      {diagnostics.schema.message ? (
        <StatusBanner
          tone={diagnostics.schema.status === 'compatible' ? 'info' : diagnostics.schema.status === 'incompatible' ? 'error' : 'warning'}
          text={diagnostics.schema.message}
        />
      ) : null}

      {diagnostics.syncStatus.lastError ? <StatusBanner tone="warning" text={`Latest sync issue: ${diagnostics.syncStatus.lastError}`} /> : null}

      {!!diagnostics.schema.checks.length ? (
        <View
          style={{
            gap: 8,
            backgroundColor: elevatedSurface,
            borderRadius: theme.radius.md,
            padding: 12,
            borderWidth: 1,
            borderColor: elevatedBorder
          }}
        >
          <Text style={{ color: elevatedTextColor, fontWeight: '800' }}>Schema Checks</Text>
          {diagnostics.schema.checks.map((check) => (
            <View key={check.key} style={{ gap: 2 }}>
              <Text style={{ color: elevatedTextColor, fontWeight: '700' }}>
                {check.label}: {check.status === 'ok' ? 'Ready' : check.status === 'incompatible' ? 'Needs migration' : 'Needs retry'}
              </Text>
              {check.message ? <Text style={{ color: elevatedSoftTextColor, lineHeight: 18 }}>{check.message}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}

      {!!diagnostics.syncStatus.failureSummaries.length ? (
        <View
          style={{
            gap: 8,
            backgroundColor: elevatedSurface,
            borderRadius: theme.radius.md,
            padding: 12,
            borderWidth: 1,
            borderColor: elevatedBorder
          }}
        >
          <Text style={{ color: elevatedTextColor, fontWeight: '800' }}>Failed Sync Items</Text>
          {diagnostics.syncStatus.failureSummaries.slice(0, 5).map((failure) => (
            <View key={failure.queueEntryId} style={{ gap: 2 }}>
              <Text style={{ color: elevatedTextColor, fontWeight: '700' }}>
                {failure.entityType} {failure.operation} · {describeSyncFailureCategory(failure.category)}
              </Text>
              <Text style={{ color: elevatedSoftTextColor, lineHeight: 18 }}>{failure.message}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <AppButton
        label="Retry Shared Bootstrap"
        onPress={() => {
          onRetryBootstrap().catch(() => undefined);
        }}
        variant="secondary"
        surfaceTone="light"
      />
      <AppButton
        label="Retry Failed Sync"
        onPress={() => {
          onRetrySync().catch(() => undefined);
        }}
        variant="tertiary"
        surfaceTone="light"
      />
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <SectionCard
      title="Backend Diagnostics"
      subtitle="Use this owner-facing snapshot before trusting shared sync, schema migrations, or new tester builds."
      tone="light"
    >
      {content}
    </SectionCard>
  );
};
