import React from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Competition, CompetitionGroup, CompetitionParticipant, CompetitionSession, CompetitionSessionAssignment, CompetitionSessionRole } from '@/types/group';
import { UserProfile } from '@/types/user';
import { AppButton } from '@/components/ui/AppButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { FormField, formInputStyle } from '@/components/ui/FormField';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { OptionChips } from '@/components/OptionChips';
import { appTheme } from '@/design/theme';

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
  onSaveAssignment
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
}) => (
  <SectionCard title="Competitions" subtitle="Set the event clock once, then let anglers join and assignments stay reviewable.">
    <Text style={{ color: '#d7f3ff', lineHeight: 20 }}>
      Competitions now own their own groups and session schedule. Organizers create the event once, anglers join by code, and assignments can be reviewed and corrected before the event starts.
    </Text>
    <FormField label="Competition Name">
      <TextInput value={newCompetitionName} onChangeText={onNewCompetitionNameChange} placeholder="Competition name" placeholderTextColor="#5a6c78" style={formInputStyle} />
    </FormField>
    <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Competition Groups</Text>
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      {[1, 2, 3, 4].map((count) => (
        <Pressable key={count} onPress={() => onCompetitionGroupCountChange(String(count))} style={{ backgroundColor: competitionGroupCount === String(count) ? '#2a9d8f' : 'rgba(255,255,255,0.12)', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 999 }}>
          <Text style={{ color: 'white', fontWeight: '700' }}>{count}</Text>
        </Pressable>
      ))}
    </View>
    <FormField label="Total Sessions">
      <TextInput value={competitionSessionCount} onChangeText={onCompetitionSessionCountChange} keyboardType="number-pad" placeholder="Session count" placeholderTextColor="#5a6c78" style={formInputStyle} />
    </FormField>
    <View style={{ gap: 8 }}>
      {competitionSchedule.map((session, index) => (
        <View key={session.sessionNumber} style={{ gap: 6, backgroundColor: appTheme.colors.surfaceMuted, borderRadius: appTheme.radius.md, padding: 12 }}>
          <Text style={{ color: '#f7fdff', fontWeight: '700' }}>Session {index + 1}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <FormField label="Start">
                <TextInput value={session.startTime} onChangeText={(value) => onCompetitionScheduleChange(index, { startTime: value })} placeholder="08:00" placeholderTextColor="#5a6c78" style={formInputStyle} />
              </FormField>
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="End">
                <TextInput value={session.endTime} onChangeText={(value) => onCompetitionScheduleChange(index, { endTime: value })} placeholder="11:00" placeholderTextColor="#5a6c78" style={formInputStyle} />
              </FormField>
            </View>
          </View>
        </View>
      ))}
    </View>
    <AppButton label="Create Competition" onPress={() => { onCreateCompetition().catch((error) => Alert.alert('Unable to create competition', error instanceof Error ? error.message : 'Please try again.')); }} />
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 1 }}>
        <FormField label="Competition Join Code">
          <TextInput value={competitionJoinCode} onChangeText={onCompetitionJoinCodeChange} placeholder="Competition join code" placeholderTextColor="#5a6c78" autoCapitalize="characters" style={formInputStyle} />
        </FormField>
      </View>
      <View style={{ justifyContent: 'center' }}>
        <AppButton label="Join" onPress={() => { onJoinCompetition().catch((error) => Alert.alert('Unable to join competition', error instanceof Error ? error.message : 'Please try again.')); }} variant="secondary" />
      </View>
    </View>

    {joinedCompetitionList.map((competition) => {
      const compGroups = competitionGroups.filter((item) => item.competitionId === competition.id);
      const compSessions = competitionSessions.filter((item) => item.competitionId === competition.id);
      const participants = competitionParticipants.filter((participant) => participant.competitionId === competition.id);
      const assignments = competitionAssignments.filter((assignment) => assignment.competitionId === competition.id);
      return (
        <View key={competition.id} style={{ gap: 8, backgroundColor: appTheme.colors.surfaceMuted, borderRadius: 14, padding: 12 }}>
          <Text style={{ color: '#f7fdff', fontWeight: '800' }}>{competition.name}</Text>
          <InlineSummaryRow label="Join Code" value={competition.joinCode} />
          <InlineSummaryRow label="Competition Groups" value={compGroups.map((group) => group.label).join(', ') || 'Not generated yet'} />
          <InlineSummaryRow label="Roster" value={`${participants.length} participants | ${new Set(assignments.map((assignment) => assignment.userId)).size} with assignments`} />
          <View style={{ gap: 6 }}>
            {compSessions.map((session) => <InlineSummaryRow key={session.id} label={`Session ${session.sessionNumber}`} value={`${session.startTime} - ${session.endTime}`} />)}
          </View>
          <View style={{ gap: 8, marginTop: 4 }}>
            <Text style={{ color: '#f7fdff', fontWeight: '700' }}>My Assignments</Text>
            {compSessions.map((session) => {
              const existingAssignment = assignments.find((assignment) => assignment.userId === currentUser.id && assignment.competitionSessionId === session.id);
              const draft = getDraftForAssignment(competition.id, currentUser.id, session.id, { competitionGroupId: existingAssignment?.competitionGroupId ?? compGroups[0]?.id ?? null, beat: existingAssignment?.beat ?? '', role: existingAssignment?.role ?? 'fishing' });
              return (
                <View key={`me-${session.id}`} style={{ gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 10 }}>
                  <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Session {session.sessionNumber}</Text>
                  <OptionChips label="Competition Group" options={compGroups.map((group) => `Group ${group.label}`)} value={compGroups.find((group) => group.id === draft.competitionGroupId) ? `Group ${compGroups.find((group) => group.id === draft.competitionGroupId)?.label}` : undefined} onChange={(value) => { const selectedGroup = compGroups.find((group) => `Group ${group.label}` === value); onUpdateAssignmentDraft(competition.id, currentUser.id, session.id, { competitionGroupId: selectedGroup?.id ?? null }); }} />
                  <FormField label="Beat / Section">
                    <TextInput value={draft.beat} onChangeText={(value) => onUpdateAssignmentDraft(competition.id, currentUser.id, session.id, { beat: value })} placeholder="Beat / section" placeholderTextColor="#5a6c78" style={formInputStyle} />
                  </FormField>
                  <OptionChips label="Role" options={['fishing', 'controlling'] as const} value={draft.role} onChange={(role) => onUpdateAssignmentDraft(competition.id, currentUser.id, session.id, { role })} />
                  <AppButton label={`Save Session ${session.sessionNumber}`} onPress={() => { onSaveAssignment(competition.id, currentUser.id, session.id, draft).catch((error) => Alert.alert('Unable to save assignment', error instanceof Error ? error.message : 'Please try again.')); }} variant="tertiary" />
                </View>
              );
            })}
          </View>
          {competition.organizerUserId === currentUser.id ? (
            <View style={{ gap: 8, marginTop: 6 }}>
              <Text style={{ color: '#f7fdff', fontWeight: '700' }}>Organizer Review</Text>
              {participants.map((participant) => {
                const participantUser = users.find((user) => user.id === participant.userId);
                return (
                  <View key={participant.id} style={{ gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 10 }}>
                    <Text style={{ color: '#f7fdff', fontWeight: '700' }}>{participantUser?.name ?? `Angler ${participant.userId}`}</Text>
                    {compSessions.map((session) => {
                      const existingAssignment = assignments.find((assignment) => assignment.userId === participant.userId && assignment.competitionSessionId === session.id);
                      const draft = getDraftForAssignment(competition.id, participant.userId, session.id, { competitionGroupId: existingAssignment?.competitionGroupId ?? compGroups[0]?.id ?? null, beat: existingAssignment?.beat ?? '', role: existingAssignment?.role ?? 'fishing' });
                      return (
                        <View key={`${participant.id}-${session.id}`} style={{ gap: 8 }}>
                          <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Session {session.sessionNumber}</Text>
                          <OptionChips label="Competition Group" options={compGroups.map((group) => `Group ${group.label}`)} value={compGroups.find((group) => group.id === draft.competitionGroupId) ? `Group ${compGroups.find((group) => group.id === draft.competitionGroupId)?.label}` : undefined} onChange={(value) => { const selectedGroup = compGroups.find((group) => `Group ${group.label}` === value); onUpdateAssignmentDraft(competition.id, participant.userId, session.id, { competitionGroupId: selectedGroup?.id ?? null }); }} />
                          <FormField label="Beat / Section">
                            <TextInput value={draft.beat} onChangeText={(value) => onUpdateAssignmentDraft(competition.id, participant.userId, session.id, { beat: value })} placeholder="Beat / section" placeholderTextColor="#5a6c78" style={formInputStyle} />
                          </FormField>
                          <OptionChips label="Role" options={['fishing', 'controlling'] as const} value={draft.role} onChange={(role) => onUpdateAssignmentDraft(competition.id, participant.userId, session.id, { role })} />
                          <AppButton label="Save Review Edit" onPress={() => { onSaveAssignment(competition.id, participant.userId, session.id, draft).catch((error) => Alert.alert('Unable to save assignment', error instanceof Error ? error.message : 'Please try again.')); }} variant="tertiary" />
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
  </SectionCard>
);
