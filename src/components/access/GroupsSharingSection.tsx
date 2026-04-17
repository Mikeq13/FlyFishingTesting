import React from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { Group, GroupMembership, SharePreference } from '@/types/group';
import { AppButton } from '@/components/ui/AppButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { FormField, getFormInputStyle } from '@/components/ui/FormField';
import { OptionChips } from '@/components/OptionChips';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { appTheme } from '@/design/theme';

export const GroupsSharingSection = ({
  currentUserId,
  newGroupName,
  onNewGroupNameChange,
  joinGroupCode,
  onJoinGroupCodeChange,
  joinedGroups,
  joinedMemberships,
  sharePreferences,
  onCreateGroup,
  onJoinGroup,
  onUpdateSharePreference
}: {
  currentUserId: number;
  newGroupName: string;
  onNewGroupNameChange: (value: string) => void;
  joinGroupCode: string;
  onJoinGroupCodeChange: (value: string) => void;
  joinedGroups: Group[];
  joinedMemberships: GroupMembership[];
  sharePreferences: SharePreference[];
  onCreateGroup: () => Promise<void>;
  onJoinGroup: () => Promise<void>;
  onUpdateSharePreference: (groupId: number, updates: Omit<SharePreference, 'id' | 'userId' | 'groupId' | 'updatedAt'>) => Promise<void>;
}) => {
  const formInputStyle = getFormInputStyle();

  return (
  <SectionCard title="Groups & Sharing" subtitle="Keep friend sharing useful and easy to understand.">
    <Text style={{ color: '#d7f3ff', lineHeight: 20 }}>
      Create or join a group, then choose what this angler shares with that crew for joint learning.
    </Text>
    <FormField label="New Group Name">
      <TextInput value={newGroupName} onChangeText={onNewGroupNameChange} placeholder="New group name" placeholderTextColor="#5a6c78" style={formInputStyle} />
    </FormField>
    <AppButton label="Create Group" onPress={() => { onCreateGroup().catch((error) => Alert.alert('Unable to create group', error instanceof Error ? error.message : 'Please try again.')); }} />
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 1 }}>
        <FormField label="Join Group Code">
          <TextInput value={joinGroupCode} onChangeText={onJoinGroupCodeChange} placeholder="Join group code" placeholderTextColor="#5a6c78" autoCapitalize="characters" style={formInputStyle} />
        </FormField>
      </View>
      <View style={{ justifyContent: 'center' }}>
        <AppButton label="Join" onPress={() => { onJoinGroup().catch((error) => Alert.alert('Unable to join group', error instanceof Error ? error.message : 'Please try again.')); }} variant="secondary" />
      </View>
    </View>

    {joinedGroups.map((group) => {
      const pref = sharePreferences.find((item) => item.groupId === group.id && item.userId === currentUserId);
      const membership = joinedMemberships.find((item) => item.groupId === group.id);
      return (
        <View key={group.id} style={{ gap: 8, backgroundColor: appTheme.colors.surfaceMuted, borderRadius: 14, padding: 12 }}>
          <Text style={{ color: '#f7fdff', fontWeight: '800' }}>{group.name}</Text>
          <InlineSummaryRow label="Join Code" value={group.joinCode} />
          <InlineSummaryRow label="Role" value={membership?.role ?? 'member'} />
          {([
            ['Journal Entries', 'shareJournalEntries'],
            ['Practice Sessions', 'sharePracticeSessions'],
            ['Competition Sessions', 'shareCompetitionSessions'],
            ['Insights', 'shareInsights']
          ] as const).map(([label, key]) => (
            <OptionChips
              key={key}
              label={label}
              options={['On', 'Off'] as const}
              value={pref && pref[key] ? 'On' : 'Off'}
              onChange={(option) =>
                onUpdateSharePreference(group.id, {
                  shareJournalEntries: pref?.shareJournalEntries ?? false,
                  sharePracticeSessions: pref?.sharePracticeSessions ?? false,
                  shareCompetitionSessions: pref?.shareCompetitionSessions ?? false,
                  shareInsights: pref?.shareInsights ?? false,
                  [key]: option === 'On'
                }).catch((error) => Alert.alert('Unable to update sharing', error instanceof Error ? error.message : 'Please try again.'))
              }
            />
          ))}
        </View>
      );
    })}
  </SectionCard>
  );
};
