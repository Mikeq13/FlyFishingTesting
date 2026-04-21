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

export const CompetitionOrganizerSection = ({
  users,
  organizerCompetitions,
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
  getDraftForAssignment,
  onUpdateAssignmentDraft,
  onCreateCompetition,
  onSaveAssignment,
  embedded = false
}: {
  users: UserProfile[];
  organizerCompetitions: Competition[];
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
  getDraftForAssignment: (
    competitionId: number,
    userId: number,
    competitionSessionId: number,
    fallback: { competitionGroupId: number | null; beat: string; role: CompetitionSessionRole }
  ) => { competitionGroupId: number | null; beat: string; role: CompetitionSessionRole };
  onUpdateAssignmentDraft: (
    competitionId: number,
    userId: number,
    competitionSessionId: number,
    next: Partial<{ competitionGroupId: number | null; beat: string; role: CompetitionSessionRole }>
  ) => void;
  onCreateCompetition: () => Promise<void>;
  onSaveAssignment: (
    competitionId: number,
    userId: number,
    competitionSessionId: number,
    draft: { competitionGroupId: number | null; beat: string; role: CompetitionSessionRole }
  ) => Promise<void>;
  embedded?: boolean;
}) => {
  const { theme } = useTheme();
  const formInputStyle = getFormInputStyle();
  const isDaylightTheme = theme.id === 'daylight_light';
  const elevatedTextColor = isDaylightTheme ? theme.colors.textDark : theme.colors.text;
  const elevatedSoftTextColor = isDaylightTheme ? theme.colors.textDarkSoft : theme.colors.textSoft;
  const elevatedSurface = isDaylightTheme ? theme.colors.nestedSurface : theme.colors.surfaceAlt;
  const elevatedBorder = isDaylightTheme ? theme.colors.nestedSurfaceBorder : theme.colors.borderStrong;
  const nestedElevatedSurface = isDaylightTheme ? theme.colors.surfaceLightAlt : theme.colors.surface;
  const nestedElevatedBorder = isDaylightTheme ? theme.colors.borderLight : theme.colors.borderStrong;

  const content = (
    <>
      {!embedded ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: elevatedTextColor, fontWeight: '800', fontSize: 16 }}>Competition Organizer</Text>
          <Text style={{ color: elevatedSoftTextColor, lineHeight: 20 }}>
            Create competitions, shape the session schedule, and review assignments without surfacing organizer controls to every angler.
          </Text>
        </View>
      ) : null}

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
              backgroundColor: elevatedSurface,
              borderRadius: theme.radius.md,
              padding: 12,
              borderWidth: 1,
              borderColor: elevatedBorder
            }}
          >
            <Text style={{ color: elevatedTextColor, fontWeight: '700' }}>Session {index + 1}</Text>
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

      {organizerCompetitions.map((competition) => {
        const compGroups = competitionGroups.filter((item) => item.competitionId === competition.id);
        const compSessions = competitionSessions.filter((item) => item.competitionId === competition.id);
        const participants = competitionParticipants.filter((participant) => participant.competitionId === competition.id);
        const assignments = competitionAssignments.filter((assignment) => assignment.competitionId === competition.id);
        return (
          <View
            key={competition.id}
            style={{
              gap: 8,
              backgroundColor: elevatedSurface,
              borderRadius: 14,
              padding: 12,
              borderWidth: 1,
              borderColor: elevatedBorder
            }}
          >
            <Text style={{ color: elevatedTextColor, fontWeight: '800' }}>{competition.name}</Text>
            <InlineSummaryRow label="Join Code" value={competition.joinCode} tone="light" />
            <InlineSummaryRow label="Roster" value={`${participants.length} participants | ${new Set(assignments.map((assignment) => assignment.userId)).size} with assignments`} tone="light" />
            {participants.map((participant) => {
              const participantUser = users.find((user) => user.id === participant.userId);
              return (
                <View
                  key={participant.id}
                  style={{
                    gap: 8,
                    backgroundColor: nestedElevatedSurface,
                    borderRadius: 12,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: nestedElevatedBorder
                  }}
                >
                  <Text style={{ color: elevatedTextColor, fontWeight: '700' }}>{participantUser?.name ?? `Angler ${participant.userId}`}</Text>
                  {compSessions.map((session) => {
                    const existingAssignment = assignments.find((assignment) => assignment.userId === participant.userId && assignment.competitionSessionId === session.id);
                    const draft = getDraftForAssignment(competition.id, participant.userId, session.id, {
                      competitionGroupId: existingAssignment?.competitionGroupId ?? compGroups[0]?.id ?? null,
                      beat: existingAssignment?.beat ?? '',
                      role: existingAssignment?.role ?? 'fishing'
                    });
                    return (
                      <View key={`${participant.id}-${session.id}`} style={{ gap: 8 }}>
                        <Text style={{ color: elevatedTextColor, fontWeight: '700' }}>Session {session.sessionNumber}</Text>
                        <OptionChips
                          label="Competition Group"
                          options={compGroups.map((group) => `Group ${group.label}`)}
                          value={compGroups.find((group) => group.id === draft.competitionGroupId) ? `Group ${compGroups.find((group) => group.id === draft.competitionGroupId)?.label}` : undefined}
                          onChange={(value) => {
                            const selectedGroup = compGroups.find((group) => `Group ${group.label}` === value);
                            onUpdateAssignmentDraft(competition.id, participant.userId, session.id, { competitionGroupId: selectedGroup?.id ?? null });
                          }}
                          tone="light"
                        />
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
        );
      })}
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <SectionCard title="Power Tools" subtitle="Competition organization is reserved for owner and power-user sessions." tone="light">
      {content}
    </SectionCard>
  );
};
