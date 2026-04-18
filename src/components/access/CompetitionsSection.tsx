import React from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { Competition, CompetitionGroup, CompetitionSession, CompetitionSessionAssignment, CompetitionSessionRole } from '@/types/group';
import { UserProfile } from '@/types/user';
import { AppButton } from '@/components/ui/AppButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { FormField, getFormInputStyle } from '@/components/ui/FormField';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { OptionChips } from '@/components/OptionChips';
import { useTheme } from '@/design/theme';

export const CompetitionsSection = ({
  currentUser,
  competitionGroups,
  competitionSessions,
  competitionAssignments,
  competitionJoinCode,
  onCompetitionJoinCodeChange,
  joinedCompetitionList,
  getDraftForAssignment,
  onUpdateAssignmentDraft,
  onJoinCompetition,
  onSaveAssignment,
  onOpenCompetitionHistory,
  embedded = false
}: {
  currentUser: UserProfile;
  competitionGroups: CompetitionGroup[];
  competitionSessions: CompetitionSession[];
  competitionAssignments: CompetitionSessionAssignment[];
  competitionJoinCode: string;
  onCompetitionJoinCodeChange: (value: string) => void;
  joinedCompetitionList: Competition[];
  getDraftForAssignment: (competitionId: number, userId: number, competitionSessionId: number, fallback: { competitionGroupId: number | null; beat: string; role: CompetitionSessionRole }) => { competitionGroupId: number | null; beat: string; role: CompetitionSessionRole };
  onUpdateAssignmentDraft: (competitionId: number, userId: number, competitionSessionId: number, next: Partial<{ competitionGroupId: number | null; beat: string; role: CompetitionSessionRole }>) => void;
  onJoinCompetition: () => Promise<void>;
  onSaveAssignment: (competitionId: number, userId: number, competitionSessionId: number, draft: { competitionGroupId: number | null; beat: string; role: CompetitionSessionRole }) => Promise<void>;
  onOpenCompetitionHistory: () => void;
  embedded?: boolean;
}) => {
  const { theme } = useTheme();
  const formInputStyle = getFormInputStyle();

  const content = (
  <>
    <View style={{ gap: 8 }}>
      <Text style={{ color: theme.colors.textDark, fontWeight: '800', fontSize: 16 }}>Competition History</Text>
      <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>
        Review competition-only sessions and experiment results without digging through every normal journal entry.
      </Text>
      <AppButton label="Open Competition History" onPress={onOpenCompetitionHistory} variant="secondary" surfaceTone="light" />
    </View>

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
          <View style={{ gap: 6 }}>
            {compSessions.map((session) => <InlineSummaryRow key={session.id} label={`Session ${session.sessionNumber}`} value={`${session.startTime} - ${session.endTime}`} tone="light" />)}
          </View>
          <View style={{ gap: 8, marginTop: 4 }}>
            <Text style={{ color: theme.colors.textDark, fontWeight: '700' }}>My Competition Assignment</Text>
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
        </View>
      );
    })}
  </>
  );

  if (embedded) {
    return content;
  }

  return (
  <SectionCard title="Competitions" subtitle="Keep participant competition tools available to everyone, and organizer tools limited to owners and power users." tone="light">
    {content}
  </SectionCard>
  );
};
