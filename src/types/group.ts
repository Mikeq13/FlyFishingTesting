export type ShareCategory = 'journal_entries' | 'practice_sessions' | 'competition_sessions' | 'insights';
export type CompetitionSessionRole = 'fishing' | 'controlling';
export type InsightsContextMode = 'mine' | 'group' | 'friend';

export interface Group {
  id: number;
  name: string;
  joinCode: string;
  createdByUserId: number;
  createdAt: string;
}

export interface GroupMembership {
  id: number;
  groupId: number;
  userId: number;
  role: 'organizer' | 'member';
  joinedAt: string;
}

export interface SharePreference {
  id: number;
  userId: number;
  groupId: number;
  shareJournalEntries: boolean;
  sharePracticeSessions: boolean;
  shareCompetitionSessions: boolean;
  shareInsights: boolean;
  updatedAt: string;
}

export interface Competition {
  id: number;
  groupId: number;
  organizerUserId: number;
  name: string;
  joinCode: string;
  startAt: string;
  endAt: string;
  createdAt: string;
}

export interface CompetitionParticipant {
  id: number;
  competitionId: number;
  userId: number;
  joinedAt: string;
}

export interface CompetitionSessionAssignment {
  id: number;
  competitionId: number;
  userId: number;
  assignedGroup: string;
  sessionNumber: number;
  beat: string;
  role: CompetitionSessionRole;
  startAt: string;
  endAt: string;
  sessionId?: number;
  createdAt: string;
  updatedAt: string;
}
