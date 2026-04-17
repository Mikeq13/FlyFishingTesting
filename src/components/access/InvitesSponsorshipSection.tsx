import React from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { Group } from '@/types/group';
import { Invite, SponsoredAccess } from '@/types/remote';
import { UserProfile } from '@/types/user';
import { AppButton } from '@/components/ui/AppButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { FormField, getFormInputStyle } from '@/components/ui/FormField';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { useTheme } from '@/design/theme';

export const InvitesSponsorshipSection = ({
  joinedGroups,
  organizerGroups,
  inviteTargetGroupId,
  onInviteTargetGroupChange,
  inviteTargetName,
  onInviteTargetNameChange,
  inviteAcceptCode,
  onInviteAcceptCodeChange,
  invites,
  sponsoredAccess,
  groups,
  users,
  currentUserId,
  onCreateInvite,
  onAcceptInvite,
  onRevokeSponsoredAccess
}: {
  joinedGroups: Group[];
  organizerGroups: Group[];
  inviteTargetGroupId: number | null;
  onInviteTargetGroupChange: (value: number) => void;
  inviteTargetName: string;
  onInviteTargetNameChange: (value: string) => void;
  inviteAcceptCode: string;
  onInviteAcceptCodeChange: (value: string) => void;
  invites: Invite[];
  sponsoredAccess: SponsoredAccess[];
  groups: Group[];
  users: UserProfile[];
  currentUserId: number;
  onCreateInvite: () => Promise<void>;
  onAcceptInvite: () => Promise<void>;
  onRevokeSponsoredAccess: (id: number) => Promise<void>;
}) => {
  const { theme } = useTheme();
  const formInputStyle = getFormInputStyle();

  return (
  <SectionCard title="Friend Invites & Sponsorship" subtitle="Invite trusted testers into shared learning and manage sponsored power-user access." tone="light">
    <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>
      Invite friends into a shared group and automatically sponsor their power-user access for beta testing.
    </Text>
    {joinedGroups.length ? (
      <>
        <Text style={{ color: theme.colors.textDark, fontWeight: '700' }}>Invite into Group</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {organizerGroups.map((group) => (
            <AppButton key={group.id} label={group.name} onPress={() => onInviteTargetGroupChange(group.id)} variant={inviteTargetGroupId === group.id ? 'primary' : 'ghost'} surfaceTone="light" />
          ))}
        </ScrollView>
        <FormField label="Friend Name (Optional)" tone="light">
          <TextInput value={inviteTargetName} onChangeText={onInviteTargetNameChange} placeholder="Friend name (optional)" placeholderTextColor={theme.colors.inputPlaceholder} style={formInputStyle} />
        </FormField>
        <AppButton label="Create Invite" onPress={() => { onCreateInvite().catch((error) => Alert.alert('Unable to create invite', error instanceof Error ? error.message : 'Please try again.')); }} surfaceTone="light" />
      </>
    ) : (
      <Text style={{ color: theme.colors.textDarkSoft }}>Create or join a friend group first before sending invites.</Text>
    )}
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 1 }}>
        <FormField label="Accept Invite Code" tone="light">
          <TextInput value={inviteAcceptCode} onChangeText={onInviteAcceptCodeChange} placeholder="Accept invite code" placeholderTextColor={theme.colors.inputPlaceholder} autoCapitalize="characters" style={formInputStyle} />
        </FormField>
      </View>
      <View style={{ justifyContent: 'center' }}>
        <AppButton label="Accept" onPress={() => { onAcceptInvite().catch((error) => Alert.alert('Unable to accept invite', error instanceof Error ? error.message : 'Please try again.')); }} variant="secondary" surfaceTone="light" />
      </View>
    </View>
    {!!invites.length && (
      <View style={{ gap: 8 }}>
        <Text style={{ color: theme.colors.textDark, fontWeight: '700' }}>Invites</Text>
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
              <InlineSummaryRow label="Code" value={invite.inviteCode} tone="light" />
              <InlineSummaryRow label="Inviter" value={inviter?.name ?? `Angler ${invite.inviterUserId}`} tone="light" />
              <InlineSummaryRow label="Status" value={invite.status} tone="light" />
            </View>
          );
        })}
      </View>
    )}
    {!!sponsoredAccess.length && (
      <View style={{ gap: 8 }}>
        <Text style={{ color: theme.colors.textDark, fontWeight: '700' }}>Sponsored Access</Text>
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
              {entry.active && entry.sponsorUserId === currentUserId ? <AppButton label="Revoke Sponsored Access" onPress={() => { onRevokeSponsoredAccess(entry.id).catch((error) => Alert.alert('Unable to revoke access', error instanceof Error ? error.message : 'Please try again.')); }} variant="danger" surfaceTone="light" /> : null}
            </View>
          );
        })}
      </View>
    )}
  </SectionCard>
  );
};
