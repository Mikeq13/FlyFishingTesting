import React from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { Group, GroupMembership, SharePreference } from '@/types/group';
import { Invite, SponsoredAccess } from '@/types/remote';
import { UserProfile } from '@/types/user';
import { AppButton } from '@/components/ui/AppButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { FormField, getFormInputStyle } from '@/components/ui/FormField';
import { OptionChips } from '@/components/OptionChips';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { useTheme } from '@/design/theme';

export const GroupsSharingSection = ({
  currentUserId,
  newGroupName,
  onNewGroupNameChange,
  joinGroupCode,
  onJoinGroupCodeChange,
  joinedGroups,
  joinedMemberships,
  groups,
  organizerGroups,
  sharePreferences,
  isAuthenticatedOwner,
  inviteTargetGroupId,
  onInviteTargetGroupChange,
  inviteTargetName,
  onInviteTargetNameChange,
  inviteAcceptCode,
  onInviteAcceptCodeChange,
  invites,
  sponsoredAccess,
  users,
  onCreateGroup,
  onJoinGroup,
  onUpdateSharePreference,
  onCreateInvite,
  onAcceptInvite,
  onRevokeSponsoredAccess,
  onLeaveGroup,
  onDeleteGroup,
  getSyncRecordState,
  embedded = false
}: {
  currentUserId: number;
  newGroupName: string;
  onNewGroupNameChange: (value: string) => void;
  joinGroupCode: string;
  onJoinGroupCodeChange: (value: string) => void;
  joinedGroups: Group[];
  joinedMemberships: GroupMembership[];
  groups: Group[];
  organizerGroups: Group[];
  sharePreferences: SharePreference[];
  isAuthenticatedOwner: boolean;
  inviteTargetGroupId: number | null;
  onInviteTargetGroupChange: (value: number) => void;
  inviteTargetName: string;
  onInviteTargetNameChange: (value: string) => void;
  inviteAcceptCode: string;
  onInviteAcceptCodeChange: (value: string) => void;
  invites: Invite[];
  sponsoredAccess: SponsoredAccess[];
  users: UserProfile[];
  onCreateGroup: () => Promise<void>;
  onJoinGroup: () => Promise<void>;
  onUpdateSharePreference: (groupId: number, updates: Omit<SharePreference, 'id' | 'userId' | 'groupId' | 'updatedAt'>) => Promise<void>;
  onCreateInvite: () => Promise<void>;
  onAcceptInvite: () => Promise<void>;
  onRevokeSponsoredAccess: (id: number) => Promise<void>;
  onLeaveGroup: (groupId: number) => Promise<{ membershipId: number | null; groupId: number; deletedGroup: boolean }>;
  onDeleteGroup: (groupId: number) => Promise<void>;
  getSyncRecordState: (
    entityType: 'group' | 'group_membership' | 'session' | 'experiment',
    recordId: number
  ) => 'active' | 'pending_delete' | 'failed_cleanup';
  embedded?: boolean;
}) => {
  const { theme } = useTheme();
  const formInputStyle = getFormInputStyle();

  const content = (
    <>
      <View style={{ gap: 8 }}>
        <Text style={{ color: theme.colors.textDark, fontWeight: '800', fontSize: 16 }}>Create or Join a Group</Text>
        <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>
          A group code joins an existing crew. It does not automatically grant sponsored power-user access.
        </Text>
      </View>

      <FormField label="New Group Name" tone="light">
        <TextInput value={newGroupName} onChangeText={onNewGroupNameChange} placeholder="New group name" placeholderTextColor={theme.colors.inputPlaceholder} style={formInputStyle} />
      </FormField>
      <AppButton label="Create Group" onPress={() => { onCreateGroup().catch((error) => Alert.alert('Unable to create group', error instanceof Error ? error.message : 'Please try again.')); }} surfaceTone="light" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <FormField label="Join Group Code" tone="light">
            <TextInput value={joinGroupCode} onChangeText={onJoinGroupCodeChange} placeholder="Join group code" placeholderTextColor={theme.colors.inputPlaceholder} autoCapitalize="characters" style={formInputStyle} />
          </FormField>
        </View>
        <View style={{ justifyContent: 'center' }}>
          <AppButton label="Join Group" onPress={() => { onJoinGroup().catch((error) => Alert.alert('Unable to join group', error instanceof Error ? error.message : 'Please try again.')); }} variant="secondary" surfaceTone="light" />
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ color: theme.colors.textDark, fontWeight: '800', fontSize: 16 }}>Accept Power User Invite</Text>
        <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>
          Use a power-user invite code when the owner has granted sponsored beta access tied to a group.
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <FormField label="Power User Invite Code" tone="light">
              <TextInput value={inviteAcceptCode} onChangeText={onInviteAcceptCodeChange} placeholder="Enter invite code" placeholderTextColor={theme.colors.inputPlaceholder} autoCapitalize="characters" style={formInputStyle} />
            </FormField>
          </View>
          <View style={{ justifyContent: 'center' }}>
            <AppButton label="Accept Invite" onPress={() => { onAcceptInvite().catch((error) => Alert.alert('Unable to accept invite', error instanceof Error ? error.message : 'Please try again.')); }} variant="secondary" surfaceTone="light" />
          </View>
        </View>
      </View>

      {isAuthenticatedOwner ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: theme.colors.textDark, fontWeight: '800', fontSize: 16 }}>Power User Invite</Text>
          <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>
            Generate a sponsored power-user invite for another tester. This joins them to a specific group and unlocks the beta access you are granting.
          </Text>
          {organizerGroups.length ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {organizerGroups.map((group) => (
                  <AppButton
                    key={group.id}
                    label={group.name}
                    onPress={() => onInviteTargetGroupChange(group.id)}
                    variant={inviteTargetGroupId === group.id ? 'primary' : 'ghost'}
                    surfaceTone="light"
                  />
                ))}
              </ScrollView>
              <FormField label="Tester Name (Optional)" tone="light">
                <TextInput value={inviteTargetName} onChangeText={onInviteTargetNameChange} placeholder="Tester name (optional)" placeholderTextColor={theme.colors.inputPlaceholder} style={formInputStyle} />
              </FormField>
              <AppButton label="Create Power User Invite" onPress={() => { onCreateInvite().catch((error) => Alert.alert('Unable to create invite', error instanceof Error ? error.message : 'Please try again.')); }} surfaceTone="light" />
            </>
          ) : (
            <Text style={{ color: theme.colors.textDarkSoft }}>
              Create or organize a group first before sending a power-user invite.
            </Text>
          )}
        </View>
      ) : null}

      {joinedGroups.map((group) => {
        const pref = sharePreferences.find((item) => item.groupId === group.id && item.userId === currentUserId);
        const membership = joinedMemberships.find((item) => item.groupId === group.id);
        const groupCleanupState = getSyncRecordState('group', group.id);
        const membershipCleanupState = membership ? getSyncRecordState('group_membership', membership.id) : 'active';
        const cleanupState = groupCleanupState !== 'active' ? groupCleanupState : membershipCleanupState;
        const isCleanupPending = cleanupState === 'pending_delete';
        const isCleanupFailed = cleanupState === 'failed_cleanup';
        return (
          <View
            key={group.id}
            style={{
              gap: 8,
              backgroundColor: theme.colors.nestedSurface,
              borderRadius: 14,
              padding: 12,
              borderWidth: 1,
              borderColor: theme.colors.nestedSurfaceBorder
            }}
          >
            <Text style={{ color: theme.colors.textDark, fontWeight: '800' }}>{group.name}</Text>
            <InlineSummaryRow label="Join Code" value={group.joinCode} tone="light" />
            <InlineSummaryRow label="Role" value={membership?.role ?? 'member'} tone="light" />
            {isCleanupPending ? (
              <Text style={{ color: theme.colors.textDarkSoft }}>
                Cleanup pending: this group is being removed from your active view while shared delete finishes syncing.
              </Text>
            ) : null}
            {isCleanupFailed ? (
              <Text style={{ color: theme.colors.danger }}>
                Cleanup failed: this group is hidden from normal use, but the shared delete needs another retry.
              </Text>
            ) : null}
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
                tone="light"
                disabled={isCleanupPending}
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
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {membership?.role !== 'organizer' ? (
                <AppButton
                  label={isCleanupPending ? 'Leaving...' : isCleanupFailed ? 'Retry Leave Group' : 'Leave Group'}
                  onPress={() => {
                    Alert.alert('Leave this group?', `You will stop sharing with ${group.name}. If you are the last member, the group will be removed.`, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Leave',
                        style: 'destructive',
                        onPress: () => {
                          onLeaveGroup(group.id)
                            .then((result) => {
                              Alert.alert('Group updated', result.deletedGroup ? 'You left the group, and it was removed because no members remained.' : 'You left the group.');
                            })
                            .catch((error) => Alert.alert('Unable to leave group', error instanceof Error ? error.message : 'Please try again.'));
                        }
                      }
                    ]);
                  }}
                  variant="neutral"
                  surfaceTone="light"
                  disabled={isCleanupPending}
                />
              ) : null}
              {membership?.role === 'organizer' ? (
                <AppButton
                  label={isCleanupPending ? 'Deleting...' : isCleanupFailed ? 'Retry Delete Group' : 'Delete Group'}
                  onPress={() => {
                    Alert.alert('Delete this group?', `${group.name} and its related sharing records will be removed for everyone in the group.`, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => {
                          onDeleteGroup(group.id)
                            .then(() => {
                              Alert.alert('Group deleted', `${group.name} and its related sharing records were removed.`);
                            })
                            .catch((error) => Alert.alert('Unable to delete group', error instanceof Error ? error.message : 'Please try again.'));
                        }
                      }
                    ]);
                  }}
                  variant="danger"
                  surfaceTone="light"
                  disabled={isCleanupPending}
                />
              ) : null}
            </View>
          </View>
        );
      })}

      {isAuthenticatedOwner && invites.length ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: theme.colors.textDark, fontWeight: '700' }}>Power User Invites</Text>
          {invites.map((invite) => {
            const group = groups.find((entry) => entry.id === invite.targetGroupId);
            const inviter = users.find((entry) => entry.id === invite.inviterUserId);
            return (
              <View
                key={invite.id}
                style={{
                  backgroundColor: theme.colors.nestedSurface,
                  borderRadius: 12,
                  padding: 10,
                  gap: 8,
                  borderWidth: 1,
                  borderColor: theme.colors.nestedSurfaceBorder
                }}
              >
                <Text style={{ color: theme.colors.textDark, fontWeight: '700' }}>{group?.name ?? 'Unknown group'}</Text>
                <InlineSummaryRow label="Invite Code" value={invite.inviteCode} tone="light" />
                <InlineSummaryRow label="Sent By" value={inviter?.name ?? `Angler ${invite.inviterUserId}`} tone="light" />
                <InlineSummaryRow label="Status" value={invite.status} tone="light" />
              </View>
            );
          })}
        </View>
      ) : null}

      {isAuthenticatedOwner && sponsoredAccess.length ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: theme.colors.textDark, fontWeight: '700' }}>Sponsored Power User Access</Text>
          {sponsoredAccess.map((entry) => {
            const group = groups.find((groupEntry) => groupEntry.id === entry.targetGroupId);
            const sponsor = users.find((user) => user.id === entry.sponsorUserId);
            const sponsored = users.find((user) => user.id === entry.sponsoredUserId);
            return (
              <View
                key={entry.id}
                style={{
                  backgroundColor: theme.colors.nestedSurface,
                  borderRadius: 12,
                  padding: 10,
                  gap: 8,
                  borderWidth: 1,
                  borderColor: theme.colors.nestedSurfaceBorder
                }}
              >
                <Text style={{ color: theme.colors.textDark, fontWeight: '700' }}>{sponsored?.name ?? `Angler ${entry.sponsoredUserId}`}</Text>
                <InlineSummaryRow label="Sponsor" value={sponsor?.name ?? `Angler ${entry.sponsorUserId}`} tone="light" />
                <InlineSummaryRow label="Group" value={group?.name ?? 'Unknown group'} tone="light" />
                <InlineSummaryRow label="Status" value={entry.active ? 'Active' : 'Revoked'} valueMuted={!entry.active} tone="light" />
                {entry.active && entry.sponsorUserId === currentUserId ? (
                  <AppButton
                    label="Revoke Sponsored Access"
                    onPress={() => { onRevokeSponsoredAccess(entry.id).catch((error) => Alert.alert('Unable to revoke access', error instanceof Error ? error.message : 'Please try again.')); }}
                    variant="danger"
                    surfaceTone="light"
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <SectionCard title="Groups" subtitle="Use group codes for normal shared crews, and use power-user invites only when the owner is granting sponsored beta access." tone="light">
      {content}
    </SectionCard>
  );
};
