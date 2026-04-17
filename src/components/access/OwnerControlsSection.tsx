import React from 'react';
import { Text, View } from 'react-native';
import { UserProfile } from '@/types/user';
import { UserDataCleanupCategory } from '@/app/storeTypes';
import { getEntitlementLabel, hasPremiumAccess } from '@/engine/entitlementEngine';
import { AppButton } from '@/components/ui/AppButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { ActionGroup } from '@/components/ui/ActionGroup';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';

export const OwnerControlsSection = ({
  ownerUser,
  users,
  cleanupConfig,
  onGrantPowerUser,
  onStartTrial,
  onMarkSubscriber,
  onResetAccess,
  onCleanupCategory,
  onDeleteAngler
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
}) => (
  <SectionCard title="Owner Controls" subtitle="Keep tester access changes powerful, but easier to scan and safer to use.">
    {ownerUser ? <Text style={{ color: '#d7f3ff' }}>Admin access is controlled by {ownerUser.name}. You can manage access while testing with any active angler.</Text> : null}
    {users.map((user) => (
      <SectionCard key={user.id} tone="light">
        <Text style={{ color: '#102a43', fontWeight: '800', fontSize: 18 }}>{user.name}</Text>
        <InlineSummaryRow label="Role" value={user.role} tone="light" />
        <InlineSummaryRow label="Access" value={getEntitlementLabel(user)} tone="light" />
        <InlineSummaryRow label="Premium" value={hasPremiumAccess(user) ? 'Enabled' : 'Locked'} tone="light" />
        {user.role === 'owner' ? (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: 'rgba(16,42,67,0.08)' }}>
            <Text style={{ color: '#102a43', fontWeight: '700' }}>Owner access stays enabled.</Text>
          </View>
        ) : (
          <ActionGroup>
            <AppButton label="Grant Power User" onPress={() => { onGrantPowerUser(user.id, user.name).catch(console.error); }} />
            <AppButton label="Start 7-Day Trial" onPress={() => { onStartTrial(user.id, user.name).catch(console.error); }} variant="secondary" />
            <AppButton label="Mark Subscriber" onPress={() => { onMarkSubscriber(user.id, user.name).catch(console.error); }} variant="tertiary" />
            <AppButton label="Reset Access" onPress={() => { onResetAccess(user.id, user.name).catch(console.error); }} variant="danger" />
            <ActionGroup>
              {cleanupConfig.map((item) => <AppButton key={`${user.id}-${item.key}`} label={item.label} onPress={() => onCleanupCategory(user.id, user.name, item.key)} variant={item.destructive ? 'danger' : 'ghost'} />)}
            </ActionGroup>
            <AppButton label="Delete Angler" onPress={() => onDeleteAngler(user.id, user.name)} variant="danger" />
          </ActionGroup>
        )}
      </SectionCard>
    ))}
  </SectionCard>
);
