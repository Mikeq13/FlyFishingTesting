import React from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { Competition, CompetitionGroup, CompetitionParticipant, CompetitionSession, CompetitionSessionAssignment, CompetitionSessionRole } from '@/types/group';
import { UserProfile } from '@/types/user';
import { AppButton } from '@/components/ui/AppButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { FormField, getFormInputStyle } from '@/components/ui/FormField';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { OptionChips } from '@/components/OptionChips';
import { useTheme } from '@/design/theme';

export const CompetitionsSection = ({
  currentUser,
  users,
  competitionGroups,
  competitionSessions,
  competitionParticipants,
  competitionAssignments,
  newCompetitionName,
  onNewCompetitionNameChange,
  competitionGroupCount,
  onCompetitionGroupCountChange,
  competitionSessionCount,
  onCompetitionSessionCountChange,
  competitionSchedule,
  onCompetitionScheduleChange,
  competitionJoinCode,
  onCompetitionJoinCodeChange,
  joinedCompetitionList,
  getDraftForAssignment,
  onUpdateAssignmentDraft,
  onCreateCompetition,
  onJoinCompetition,
  onSaveAssignment,
  embedded = false
}: {
  currentUser: UserProfile;
  users: UserProfile[];
  competitionGroups: CompetitionGroup[];
  competitionSessions: CompetitionSession[];
  competitionParticipants: CompetitionParticipant[];
  competitionAssignments: CompetitionSessionAssignment[];
  newCompetitionName: string;
  onNewCompetitionNameChange: (value: string) => void;
  competitionGroupCount: string;
  onCompetitionGroupCountChange: (value: string) => void;
  competitionSessionCount: string;
  onCompetitionSessionCountChange: (value: string) => void;
  competitionSchedule: Array<{ sessionNumber: number; startTime: string; endTime: string }>;
  onCompetitionScheduleChange: (index: number, next: Partial<{ startTime: string; endTime: string }>) => void;
  competitionJoinCode: string;
  onCompetitionJoinCodeChange: (value: string) => void;
  joinedCompetitionList: Competition[];
  getDraftForAssignment: (competitionId: number, userId: number, competitionSessionId: number, fallback: { competitionGroupId: number | null; beat: string; role: CompetitionSessionRole }) => { competitionGroupId: number | null; beat: string; role: CompetitionSessionRole };
  onUpdateAssignmentDraft: (competitionId: number, userId: number, competitionSessionId: number, next: Partial<{ competitionGroupId: number | null; beat: string; role: CompetitionSessionRole }>) => void;
  onCreateCompetition: () => Promise<void>;
  onJoinCompetition: () => Promise<void>;
  onSaveAssignment: (competitionId: number, userId: number, competitionSessionId: number, draft: { competitionGroupId: number | null; beat: string; role: CompetitionSessionRole }) => Promise<void>;
  embedded?: boolean;
}) => {
  const { theme } = useTheme();
  const formInputStyle = getFormInputStyle();

  const content = (
  <>
    <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>
      Competitions now own their own groups and session schedule. Organizers create the event once, anglers join by code, and assignments can be reviewed and corrected before the event starts.
    </Text>
    <FormField label="Competition Name" tone="light">
      <TextInput value={newCompetitionName} onChangeText={onNewCompetitionNameChange} placeholder="Competition name" placeholderTextColor={theme.colors.inputPlaceholder} style={formInputStyle} />
    </FormField>
    <OptionChips
      label="Competition Groups"
      options={['1', '2', '3', '4'] as const}
      value={competitionGroupCount as '1' | '2' | '3' | '4'}
      onChange={onCompetitionGroupCountChange}
      tone="light"
    />
    <FormField label="Total Sessions" tone="light">
      <TextInput value={competitionSessionCount} onChangeText={onCompetitionSessionCountChange} keyboardType="number-pad" placeholder="Session count" placeholderTextColor={theme.colors.inputPlaceholder} style={formInputStyle} />
    </FormField>
    <View style={{ gap: 8 }}>
      {competitionSchedule.map((session, index) => (
        <View
          key={session.sessionNumber}
          style={{
            gap: 6,
            backgroundColor: theme.colors.nestedSurface,
            borderRadius: theme.radius.md,
            padding: 12,
            borderWidth: 1,
            borderColor: theme.colors.nestedSurfaceBorder
          }}
        >
          <Text style={{ color: theme.colors.textDark, fontWeight: '700' }}>Session {index + 1}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <FormField label="Start" tone="light">
                <TextInput value={session.startTime} onChangeText={(value) => onCompetitionScheduleChange(index, { startTime: value })} placeholder="08:00" placeholderTextColor={theme.colors.inputPlaceholder} style={formInputStyle} />
              </FormField>
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="End" tone="light">
                <TextInput value={session.endTime} onChangeText={(value) => onCompetitionScheduleChange(index, { endTime: value })} placeholder="11:00" placeholderTextColor={theme.colors.inputPlaceholder} style={formInputStyle} />
              </FormField>
            </View>
          </View>
        </View>
      ))}
    </View>
    <AppButton label="Create Competition" onPress={() => { onCreateCompetition().catch((error) => Alert.alert('Unable to create competition', error instanceof Error ? error.message : 'Please try again.')); }} surfaceTone="light" />
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 1 }}>
        <FormField label="Competition Join Code" tone="light">
          <TextInput value={competitionJoinCode} onChangeText={onCompetitionJoinCodeChange} placeholder="Competition join code" placeholderTextColor={theme.colors.inputPlaceholder} autoCapitalize="characters" style={formInputStyle} />
        </FormField>
      </View>
      <View style={{ justifyContent: 'center' }}>
        <AppButton label="Join" onPress={() => { onJoinCompetition().catch((error) => Alert.alert('Unable to join competition', error instanceof Error ? error.message : 'Please try again.')); }} variant="secondary" surfaceTone="light" />
      </View>
    </View>

    {joinedCompetitionList.map((competition) => {
      const compGroups = competitionGroups.filter((item) => item.competitionId === competition.id);
      const compSessions = competitionSessions.filter((item) => item.competitionId === competition.id);
      const participants = competitionParticipants.filter((participant) => participant.competitionId === competition.id);
      const assignments = competitionAssignments.filter((assignment) => assignment.competitionId === competition.id);
      return (
        <View
          key={competition.id}
          style={{
            gap: 8,
            backgroundColor: theme.colors.nestedSurface,
            borderRadius: 14,
            padding: 12,
            borderWidth: 1,
            borderColor: theme.colors.nestedSurfaceBorder
          }}
        >
          <Text style={{ color: theme.colors.textDark, fontWeight: '800' }}>{competition.name}</Text>
          <InlineSummaryRow label="Join Code" value={competition.joinCode} tone="light" />
          <InlineSummaryRow label="Competition Groups" value={compGroups.map((group) => group.label).join(', ') || 'Not generated yet'} tone="light" />
          <InlineSummaryRow label="Roster" value={`${participants.length} participants | ${new Set(assignments.map((assignment) => assignment.userId)).size} with assignments`} tone="light" />
          <View style={{ gap: 6 }}>
            {compSessions.map((session) => <InlineSummaryRow key={session.id} label={`Session ${session.sessionNumber}`} value={`${session.startTime} - ${session.endTime}`} tone="light" />)}
          </View>
          <View style={{ gap: 8, marginTop: 4 }}>
            <Text style={{ color: theme.colors.textDark, fontWeight: '700' }}>My Assignments</Text>
            {compSessions.map((session) => {
              const existingAssignment = assignments.find((assignment) => assignment.userId === currentUser.id && assignment.competitionSessionId === session.id);
              const draft = getDraftForAssignment(competition.id, currentUser.id, session.id, { competitionGroupId: existingAssignment?.competitionGroupId ?? compGroups[0]?.id ?? null, beat: existingAssignment?.beat ?? '', role: existingAssignment?.role ?? 'fishing' });
              return (
                <View
                  key={`me-${session.id}`}
                  style={{
                    gap: 8,
                    backgroundColor: theme.colors.surfaceLightAlt,
                    borderRadius: 12,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: theme.colors.borderLight
                  }}
                >
                  <Text style={{ color: theme.colors.textDark, fontWeight: '700' }}>Session {session.sessionNumber}</Text>
                  <OptionChips label="Competition Group" options={compGroups.map((group) => `Group ${group.label}`)} value={compGroups.find((group) => group.id === draft.competitionGroupId) ? `Group ${compGroups.find((group) => group.id === draft.competitionGroupId)?.label}` : undefined} onChange={(value) => { const selectedGroup = compGroups.find((group) => `Group ${group.label}` === value); onUpdateAssignmentDraft(competition.id, currentUser.id, session.id, { competitionGroupId: selectedGroup?.id ?? null }); }} tone="light" />
                  <FormField label="Beat / Section" tone="light">
                    <TextInput value={draft.beat} onChangeText={(value) => onUpdateAssignmentDraft(competition.id, currentUser.id, session.id, { beat: value })} placeholder="Beat / section" placeholderTextColor={theme.colors.inputPlaceholder} style={formInputStyle} />
                  </FormField>
                  <OptionChips label="Role" options={['fishing', 'controlling'] as const} value={draft.role} onChange={(role) => onUpdateAssignmentDraft(competition.id, currentUser.id, session.id, { role })} tone="light" />
                  <AppButton label={`Save Session ${session.sessionNumber}`} onPress={() => { onSaveAssignment(competition.id, currentUser.id, session.id, draft).catch((error) => Alert.alert('Unable to save assignment', error instanceof Error ? error.message : 'Please try again.')); }} variant="tertiary" surfaceTone="light" />
                </View>
              );
            })}
          </View>
          {competition.organizerUserId === currentUser.id ? (
            <View style={{ gap: 8, marginTop: 6 }}>
              <Text style={{ color: theme.colors.textDark, fontWeight: '700' }}>Organizer Review</Text>
              {participants.map((participant) => {
                const participantUser = users.find((user) => user.id === participant.userId);
                return (
                  <View
                    key={participant.id}
                    style={{
                      gap: 8,
                      backgroundColor: theme.colors.surfaceLightAlt,
                      borderRadius: 12,
                      padding: 10,
                      borderWidth: 1,
                      borderColor: theme.colors.borderLight
                    }}
                  >
                    <Text style={{ color: theme.colors.textDark, fontWeight: '700' }}>{participantUser?.name ?? `Angler ${participant.userId}`}</Text>
                    {compSessions.map((session) => {
                      const existingAssignment = assignments.find((assignment) => assignment.userId === participant.userId && assignment.competitionSessionId === session.id);
                      const draft = getDraftForAssignment(competition.id, participant.userId, session.id, { competitionGroupId: existingAssignment?.competitionGroupId ?? compGroups[0]?.id ?? null, beat: existingAssignment?.beat ?? '', role: existingAssignment?.role ?? 'fishing' });
                      return (
                        <View key={`${participant.id}-${session.id}`} style={{ gap: 8 }}>
                          <Text style={{ color: theme.colors.textDark, fontWeight: '700' }}>Session {session.sessionNumber}</Text>
                          <OptionChips label="Competition Group" options={compGroups.map((group) => `Group ${group.label}`)} value={compGroups.find((group) => group.id === draft.competitionGroupId) ? `Group ${compGroups.find((group) => group.id === draft.competitionGroupId)?.label}` : undefined} onChange={(value) => { const selectedGroup = compGroups.find((group) => `Group ${group.label}` === value); onUpdateAssignmentDraft(competition.id, participant.userId, session.id, { competitionGroupId: selectedGroup?.id ?? null }); }} tone="light" />
                          <FormField label="Beat / Section" tone="light">
                            <TextInput value={draft.beat} onChangeText={(value) => onUpdateAssignmentDraft(competition.id, participant.userId, session.id, { beat: value })} placeholder="Beat / section" placeholderTextColor={theme.colors.inputPlaceholder} style={formInputStyle} />
                          </FormField>
                          <OptionChips label="Role" options={['fishing', 'controlling'] as const} value={draft.role} onChange={(role) => onUpdateAssignmentDraft(competition.id, participant.userId, session.id, { role })} tone="light" />
                          <AppButton label="Save Review Edit" onPress={() => { onSaveAssignment(competition.id, participant.userId, session.id, draft).catch((error) => Alert.alert('Unable to save assignment', error instanceof Error ? error.message : 'Please try again.')); }} variant="tertiary" surfaceTone="light" />
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      );
    })}
  </>
  );

  if (embedded) {
    return content;
  }

  return (
  <SectionCard title="Competitions" subtitle="Set the event clock once, then let anglers join and assignments stay reviewable." tone="light">
    {content}
  </SectionCard>
  );
};
