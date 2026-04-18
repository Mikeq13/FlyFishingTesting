import React from 'react';
import { Text, View } from 'react-native';
import { UserProfile } from '@/types/user';
import { AppButton } from '@/components/ui/AppButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { ActionGroup } from '@/components/ui/ActionGroup';
import { useTheme } from '@/design/theme';

export const OwnerControlsSection = ({
  ownerUser,
  manageableUsers,
  onGrantPowerUser,
  onStartTrial,
  onResetAccess,
  embedded = false
}: {
  ownerUser: UserProfile | null;
  manageableUsers: UserProfile[];
  onGrantPowerUser: (userId: number, name: string) => Promise<void>;
  onStartTrial: (userId: number, name: string) => Promise<void>;
  onResetAccess: (userId: number, name: string) => Promise<void>;
  embedded?: boolean;
}) => {
  const { theme } = useTheme();

  const content = (
  <>
    {ownerUser ? <Text style={{ color: theme.colors.textDarkSoft }}>Only the linked owner account can grant power-user access, start a seven-day trial, or reset someone back to free access.</Text> : null}
    {!manageableUsers.length ? (
      <View
        style={{
          gap: theme.spacing.sm,
          backgroundColor: theme.colors.nestedSurface,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.nestedSurfaceBorder
        }}
      >
        <Text style={{ color: theme.colors.textDark, fontWeight: '700' }}>No tester accounts to manage yet.</Text>
        <Text style={{ color: theme.colors.textDarkSoft }}>When another angler signs in on this beta backend, they will appear here once instead of duplicating across stale local rows.</Text>
      </View>
    ) : null}
    {manageableUsers.map((user) => (
      <View
        key={user.id}
        style={{
          gap: theme.spacing.sm,
          backgroundColor: theme.colors.nestedSurface,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.nestedSurfaceBorder
        }}
      >
        <Text style={{ color: theme.colors.textDark, fontWeight: '800', fontSize: 18 }}>{user.name}</Text>
        <ActionGroup>
          <AppButton label="Grant Power User" onPress={() => { onGrantPowerUser(user.id, user.name).catch(console.error); }} surfaceTone="light" />
          <AppButton label="Start 7-Day Trial" onPress={() => { onStartTrial(user.id, user.name).catch(console.error); }} variant="secondary" surfaceTone="light" />
          <AppButton label="Revoke Access" onPress={() => { onResetAccess(user.id, user.name).catch(console.error); }} variant="danger" surfaceTone="light" />
        </ActionGroup>
      </View>
    ))}
  </>
  );

  if (embedded) {
    return content;
  }

  return (
  <SectionCard title="Owner Controls" subtitle="Keep tester access changes powerful, but easier to scan and safer to use." tone="light">
    {content}
  </SectionCard>
  );
};
