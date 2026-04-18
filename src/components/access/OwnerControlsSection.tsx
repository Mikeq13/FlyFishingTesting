import React from 'react';
import { Text, View } from 'react-native';
import { UserProfile } from '@/types/user';
import { UserDataCleanupCategory } from '@/app/storeTypes';
import { AppButton } from '@/components/ui/AppButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { ActionGroup } from '@/components/ui/ActionGroup';
import { useTheme } from '@/design/theme';

export const OwnerControlsSection = ({
  ownerUser,
  users,
  cleanupConfig,
  onGrantPowerUser,
  onStartTrial,
  onMarkSubscriber,
  onResetAccess,
  onCleanupCategory,
  onDeleteAngler,
  embedded = false
}: {
  ownerUser: UserProfile | null;
  users: UserProfile[];
  cleanupConfig: Array<{ key: UserDataCleanupCategory; label: string; description: string; destructive?: boolean }>;
  onGrantPowerUser: (userId: number, name: string) => Promise<void>;
  onStartTrial: (userId: number, name: string) => Promise<void>;
  onMarkSubscriber: (userId: number, name: string) => Promise<void>;
  onResetAccess: (userId: number, name: string) => Promise<void>;
  onCleanupCategory: (userId: number, userName: string, category: UserDataCleanupCategory) => void;
  onDeleteAngler: (userId: number, userName: string) => void;
  embedded?: boolean;
}) => {
  const { theme } = useTheme();

  const content = (
  <>
    {ownerUser ? <Text style={{ color: theme.colors.textDarkSoft }}>Admin access is controlled by {ownerUser.name} and only unlocks when the linked owner account is the one signed in.</Text> : null}
    {users.map((user) => (
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
        {user.role === 'owner' ? (
          <View style={{ backgroundColor: theme.colors.surfaceLightAlt, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: theme.colors.borderLight }}>
            <Text style={{ color: theme.colors.textDark, fontWeight: '700' }}>Owner access stays enabled.</Text>
          </View>
        ) : (
          <ActionGroup>
            <AppButton label="Grant Power User" onPress={() => { onGrantPowerUser(user.id, user.name).catch(console.error); }} surfaceTone="light" />
            <AppButton label="Start 7-Day Trial" onPress={() => { onStartTrial(user.id, user.name).catch(console.error); }} variant="secondary" surfaceTone="light" />
            <AppButton label="Mark Subscriber" onPress={() => { onMarkSubscriber(user.id, user.name).catch(console.error); }} variant="tertiary" surfaceTone="light" />
            <AppButton label="Reset Access" onPress={() => { onResetAccess(user.id, user.name).catch(console.error); }} variant="danger" surfaceTone="light" />
            <ActionGroup>
              {cleanupConfig.map((item) => <AppButton key={`${user.id}-${item.key}`} label={item.label} onPress={() => onCleanupCategory(user.id, user.name, item.key)} variant={item.destructive ? 'danger' : 'ghost'} surfaceTone="light" />)}
            </ActionGroup>
            <AppButton label="Delete Angler" onPress={() => onDeleteAngler(user.id, user.name)} variant="danger" surfaceTone="light" />
          </ActionGroup>
        )}
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
