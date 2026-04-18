import React from 'react';
import { Alert, Text, View } from 'react-native';
import { ActionGroup } from '@/components/ui/ActionGroup';
import { AppButton } from '@/components/ui/AppButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { useTheme } from '@/design/theme';

export const LocalDataSection = ({
  isOwner,
  cleanupActions,
  cleanupStatus,
  onDeleteProfile,
  embedded = false
}: {
  isOwner: boolean;
  cleanupActions: React.ReactNode;
  cleanupStatus?: {
    pendingDeleteCount: number;
    failedDeleteCount: number;
    lastFailedDeleteMessage?: string | null;
  };
  onDeleteProfile: () => Promise<void>;
  embedded?: boolean;
}) => {
  const { theme } = useTheme();

  const content = (
  <>
    <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>
      Clean up local and synced fishing data for the active profile. Joined shared records are detached instead of globally deleted, so Clear Everything behaves like a fresh start for this angler.
    </Text>
    <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>
      Draft, legacy, archived, and pending-delete records are handled differently so the app can stay trustworthy while cleanup sync finishes.
    </Text>
    {cleanupStatus?.pendingDeleteCount ? (
      <View style={{ backgroundColor: theme.colors.nestedSurface, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: theme.colors.nestedSurfaceBorder }}>
        <Text style={{ color: theme.colors.textDarkSoft }}>
          Cleanup in progress: {cleanupStatus.pendingDeleteCount} item{cleanupStatus.pendingDeleteCount === 1 ? '' : 's'} still waiting to delete from shared data.
        </Text>
      </View>
    ) : null}
    {cleanupStatus?.failedDeleteCount ? (
      <View style={{ backgroundColor: theme.colors.nestedSurface, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: theme.colors.errorBorder }}>
        <Text style={{ color: theme.colors.textDarkSoft }}>
          Cleanup needs attention: {cleanupStatus.failedDeleteCount} delete {cleanupStatus.failedDeleteCount === 1 ? 'action has' : 'actions have'} failed and will retry.
          {cleanupStatus.lastFailedDeleteMessage ? ` Last error: ${cleanupStatus.lastFailedDeleteMessage}` : ''}
        </Text>
      </View>
    ) : null}
    <ActionGroup>{cleanupActions}</ActionGroup>
    {!isOwner ? (
      <AppButton
        label="Delete My Angler Profile"
        onPress={() => onDeleteProfile().catch((error) => Alert.alert('Unable to delete profile', error instanceof Error ? error.message : 'Please try again.'))}
        variant="danger"
        surfaceTone="light"
      />
    ) : (
      <View style={{ backgroundColor: theme.colors.nestedSurface, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: theme.colors.nestedSurfaceBorder }}>
        <Text style={{ color: theme.colors.textDarkSoft }}>
          The owner profile stays in place, but you can still clear its fishing data when you want a fresh start.
        </Text>
      </View>
    )}
  </>
  );

  if (embedded) {
    return content;
  }

  return (
  <SectionCard title="Data Management" subtitle="Manage local fishing data for the active profile without affecting other anglers on this device." tone="light">
    {content}
  </SectionCard>
  );
};
