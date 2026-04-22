import { createCatchEvent } from '@/db/catchEventRepo';
import {
  createCompetition,
  createCompetitionGroup,
  createCompetitionParticipant,
  createCompetitionSession,
  upsertCompetitionAssignment
} from '@/db/competitionRepo';
import { createExperiment } from '@/db/experimentRepo';
import { createGroup, createGroupMembership, createSharePreference } from '@/db/groupRepo';
import { initDb, isWeb } from '@/db/schema';
import { createSavedFly } from '@/db/savedFlyRepo';
import { createSavedLeaderFormula } from '@/db/savedLeaderFormulaRepo';
import { createSavedRigPreset } from '@/db/savedRigPresetRepo';
import { createSavedRiver } from '@/db/savedRiverRepo';
import { getActiveUserId, getAppSetting, setActiveUserId, setAppSetting } from '@/db/settingsRepo';
import { createSession } from '@/db/sessionRepo';
import { createSessionGroupShare } from '@/db/sessionGroupShareRepo';
import { createSessionSegment } from '@/db/sessionSegmentRepo';
import { createUser, listUsers } from '@/db/userRepo';
import { clearWebValuesByPrefix } from '@/db/webStore';
import { CatchEvent, SessionSegment } from '@/types/activity';
import { ExperimentFlyEntry, TroutSpecies } from '@/types/experiment';
import { FlySetup } from '@/types/fly';
import { AddedTippetSection, LeaderFormulaSection, RigSetup } from '@/types/rig';
import { UserProfile } from '@/types/user';

export const WEB_DEMO_SEED_VERSION = '2026-04-21-web-demo-v1';
export const WEB_DEMO_SEED_VERSION_KEY = 'web_demo.seed_version';

export const isWebDemoModeEnabled = () => isWeb && process.env.EXPO_PUBLIC_WEB_DEMO_MODE === 'true';

type DemoBootstrapResult = {
  users: UserProfile[];
  activeUserId: number | null;
};

const iso = (value: string) => new Date(value).toISOString();

const makeFly = (
  name: string,
  details: Partial<FlySetup> = {}
): FlySetup => ({
  name,
  intent: details.intent ?? 'imitative',
  hookSize: details.hookSize ?? 16,
  beadSizeMm: details.beadSizeMm ?? 3,
  beadColor: details.beadColor ?? 'black',
  bodyType: details.bodyType ?? 'dubbing',
  bugFamily: details.bugFamily ?? 'mayfly',
  bugStage: details.bugStage ?? 'nymph',
  tail: details.tail ?? 'natural',
  collar: details.collar ?? 'none'
});

const makeRigSetup = (
  leaderFormulaName: string,
  leaderFormulaSectionsSnapshot: LeaderFormulaSection[],
  assignments: Array<{ position: 'dropper' | 'middle dropper' | 'point'; fly: FlySetup }>,
  addedTippetSections: AddedTippetSection[]
): RigSetup => ({
  leaderFormulaName,
  leaderFormulaSectionsSnapshot,
  assignments,
  addedTippetSections
});

const makeExperimentEntries = (
  baselineFly: FlySetup,
  testFly: FlySetup,
  baselineStats: { casts: number; catches: number; species: TroutSpecies[]; sizes: number[]; timestamps: string[] },
  testStats: { casts: number; catches: number; species: TroutSpecies[]; sizes: number[]; timestamps: string[] }
): ExperimentFlyEntry[] => [
  {
    slotId: 'baseline',
    label: 'Baseline',
    role: 'baseline',
    fly: baselineFly,
    casts: baselineStats.casts,
    catches: baselineStats.catches,
    fishSpecies: baselineStats.species,
    fishSizesInches: baselineStats.sizes,
    catchTimestamps: baselineStats.timestamps
  },
  {
    slotId: 'test',
    label: 'Test',
    role: 'test',
    fly: testFly,
    casts: testStats.casts,
    catches: testStats.catches,
    fishSpecies: testStats.species,
    fishSizesInches: testStats.sizes,
    catchTimestamps: testStats.timestamps
  }
];

const createDemoSessionGroupShare = async (userId: number, sessionId: number, groupId: number) => {
  await createSessionGroupShare({ userId, sessionId, groupId });
};

const seedDemoData = async (): Promise<number> => {
  const demoUserId = await createUser({
    name: 'Demo Angler',
    email: 'demo@fishinglab.local',
    role: 'angler',
    accessLevel: 'power_user',
    subscriptionStatus: 'power_user'
  });
  const teammateUserId = await createUser({
    name: 'River Teammate',
    email: 'teammate@fishinglab.local',
    role: 'angler',
    accessLevel: 'subscriber',
    subscriptionStatus: 'active'
  });

  const euroLeaderSections: LeaderFormulaSection[] = [
    { order: 1, materialLabel: '20 lb butt', lengthFeet: 6 },
    { order: 2, materialLabel: '12 lb bi-color sighter', lengthFeet: 2 },
    { order: 3, materialLabel: '5x tippet', lengthFeet: 4 }
  ];
  const dryDropperLeaderSections: LeaderFormulaSection[] = [
    { order: 1, materialLabel: '9 ft 4x tapered leader', lengthFeet: 9 },
    { order: 2, materialLabel: '5x dropper tag', lengthFeet: 2 }
  ];

  await createSavedRiver({ userId: demoUserId, name: 'Middle Provo River' });
  await createSavedRiver({ userId: demoUserId, name: 'Lower Green River' });

  const frenchie = makeFly('Frenchie Flashback', { hookSize: 16, beadSizeMm: 3, beadColor: 'gold', bodyType: 'natural', bugFamily: 'mayfly' });
  const blackPerdigon = makeFly('Black Perdigon', { hookSize: 18, beadSizeMm: 2.8, beadColor: 'silver', bodyType: 'thread', bugFamily: 'midge' });
  const pinkTag = makeFly('Pink Tag Jig', { hookSize: 16, beadSizeMm: 3.3, beadColor: 'pink', bugFamily: 'mayfly', bugStage: 'nymph' });
  const adams = makeFly('Parachute Adams', { hookSize: 16, beadSizeMm: 0, beadColor: 'black', bodyType: 'natural', bugStage: 'adult', collar: 'hackle' });
  const cdcCaddis = makeFly('CDC Caddis', { hookSize: 16, beadSizeMm: 0, beadColor: 'black', bodyType: 'natural', bugFamily: 'caddis', bugStage: 'adult', collar: 'cdc' });

  for (const fly of [frenchie, blackPerdigon, pinkTag, adams, cdcCaddis]) {
    await createSavedFly({ userId: demoUserId, ...fly });
  }

  const euroLeaderId = await createSavedLeaderFormula({
    userId: demoUserId,
    name: 'Wasatch Euro Two-Fly',
    sections: euroLeaderSections
  });
  const dryDropperLeaderId = await createSavedLeaderFormula({
    userId: demoUserId,
    name: 'Pocket Water Dry Dropper',
    sections: dryDropperLeaderSections
  });

  await createSavedRigPreset({
    userId: demoUserId,
    name: 'Fast Run Euro Pair',
    leaderFormulaId: euroLeaderId,
    leaderFormulaName: 'Wasatch Euro Two-Fly',
    leaderFormulaSectionsSnapshot: euroLeaderSections,
    flyCount: 2,
    positions: ['dropper', 'point'],
    addedTippetSections: [
      { order: 1, label: 'Dropper to point', size: '5x', lengthFeet: 1.5 }
    ]
  });
  await createSavedRigPreset({
    userId: demoUserId,
    name: 'Pocket Water Dry Dropper',
    leaderFormulaId: dryDropperLeaderId,
    leaderFormulaName: 'Pocket Water Dry Dropper',
    leaderFormulaSectionsSnapshot: dryDropperLeaderSections,
    flyCount: 2,
    positions: ['dropper', 'point'],
    addedTippetSections: [
      { order: 1, label: 'Dry to dropper', size: '5x', lengthFeet: 2 }
    ]
  });

  const demoGroup = await createGroup({ name: 'Demo River Crew', createdByUserId: demoUserId });
  await createGroupMembership({ groupId: demoGroup.id, userId: demoUserId, role: 'organizer' });
  await createGroupMembership({ groupId: demoGroup.id, userId: teammateUserId, role: 'member' });
  await createSharePreference({
    userId: demoUserId,
    groupId: demoGroup.id,
    shareJournalEntries: true,
    sharePracticeSessions: true,
    shareCompetitionSessions: true,
    shareInsights: true
  });
  await createSharePreference({
    userId: teammateUserId,
    groupId: demoGroup.id,
    shareJournalEntries: true,
    sharePracticeSessions: true,
    shareCompetitionSessions: true,
    shareInsights: true
  });

  const euroRig = makeRigSetup(
    'Wasatch Euro Two-Fly',
    euroLeaderSections,
    [
      { position: 'dropper', fly: frenchie },
      { position: 'point', fly: blackPerdigon }
    ],
    [{ order: 1, label: 'Dropper to point', size: '5x', lengthFeet: 1.5 }]
  );
  const pinkEuroRig = makeRigSetup(
    'Wasatch Euro Two-Fly',
    euroLeaderSections,
    [
      { position: 'dropper', fly: pinkTag },
      { position: 'point', fly: blackPerdigon }
    ],
    [{ order: 1, label: 'Dropper to point', size: '5x', lengthFeet: 1.5 }]
  );
  const dryDropperRig = makeRigSetup(
    'Pocket Water Dry Dropper',
    dryDropperLeaderSections,
    [
      { position: 'dropper', fly: adams },
      { position: 'point', fly: pinkTag }
    ],
    [{ order: 1, label: 'Dry to dropper', size: '5x', lengthFeet: 2 }]
  );

  const practiceSessionId = await createSession({
    userId: demoUserId,
    date: iso('2026-04-20T13:00:00-06:00'),
    mode: 'practice',
    startAt: iso('2026-04-20T13:00:00-06:00'),
    endedAt: iso('2026-04-20T15:30:00-06:00'),
    waterType: 'riffle',
    depthRange: '1.5-3 ft',
    practiceMeasurementEnabled: true,
    practiceLengthUnit: 'in',
    startingRigSetup: euroRig,
    startingTechnique: 'Euro Nymphing',
    riverName: 'Middle Provo River',
    notes: 'Started fast and technical, then adjusted once the fish slid into softer lanes.'
  });
  await createDemoSessionGroupShare(demoUserId, practiceSessionId, demoGroup.id);

  const practiceSegments: Array<Omit<SessionSegment, 'id' | 'userId' | 'sessionId'>> = [
    {
      mode: 'practice',
      riverName: 'Middle Provo River',
      waterType: 'riffle',
      depthRange: '1.5-3 ft',
      startedAt: iso('2026-04-20T13:00:00-06:00'),
      endedAt: iso('2026-04-20T13:42:00-06:00'),
      rigSetup: euroRig,
      flySnapshots: euroRig.assignments.map((assignment) => assignment.fly),
      technique: 'Euro Nymphing',
      notes: 'Good drift control, but fish followed without committing.'
    },
    {
      mode: 'practice',
      riverName: 'Middle Provo River',
      waterType: 'run',
      depthRange: '3-5 ft',
      startedAt: iso('2026-04-20T13:42:00-06:00'),
      endedAt: iso('2026-04-20T14:38:00-06:00'),
      rigSetup: pinkEuroRig,
      flySnapshots: pinkEuroRig.assignments.map((assignment) => assignment.fly),
      technique: 'Euro Nymphing',
      notes: 'Switching to the pink tag increased takes in the deeper current seam.'
    },
    {
      mode: 'practice',
      riverName: 'Middle Provo River',
      waterType: 'pocket water',
      depthRange: '<1.5 ft',
      startedAt: iso('2026-04-20T14:38:00-06:00'),
      endedAt: iso('2026-04-20T15:30:00-06:00'),
      rigSetup: dryDropperRig,
      flySnapshots: dryDropperRig.assignments.map((assignment) => assignment.fly),
      technique: 'Dry Dropper',
      notes: 'When the light improved, the dry-dropper kept fish willing in the shallower pockets.'
    }
  ];
  const segmentIds: number[] = [];
  for (const segment of practiceSegments) {
    segmentIds.push(await createSessionSegment({ userId: demoUserId, sessionId: practiceSessionId, ...segment }));
  }

  const practiceCatches: Array<Omit<CatchEvent, 'id' | 'userId'>> = [
    {
      sessionId: practiceSessionId,
      segmentId: segmentIds[1],
      mode: 'practice',
      flyName: pinkTag.name,
      flySnapshot: pinkTag,
      species: 'Brown',
      lengthValue: 15.5,
      lengthUnit: 'in',
      caughtAt: iso('2026-04-20T13:58:00-06:00'),
      notes: 'First good eat after moving into the deeper seam.'
    },
    {
      sessionId: practiceSessionId,
      segmentId: segmentIds[1],
      mode: 'practice',
      flyName: blackPerdigon.name,
      flySnapshot: blackPerdigon,
      species: 'Rainbow',
      lengthValue: 17,
      lengthUnit: 'in',
      caughtAt: iso('2026-04-20T14:21:00-06:00')
    },
    {
      sessionId: practiceSessionId,
      segmentId: segmentIds[2],
      mode: 'practice',
      flyName: adams.name,
      flySnapshot: adams,
      species: 'Cutthroat',
      lengthValue: 14,
      lengthUnit: 'in',
      caughtAt: iso('2026-04-20T15:02:00-06:00')
    }
  ];
  for (const event of practiceCatches) {
    await createCatchEvent({ userId: demoUserId, ...event });
  }

  const runExperimentSessionId = await createSession({
    userId: demoUserId,
    date: iso('2026-04-19T09:15:00-06:00'),
    mode: 'experiment',
    startAt: iso('2026-04-19T09:15:00-06:00'),
    endedAt: iso('2026-04-19T11:10:00-06:00'),
    waterType: 'run',
    depthRange: '3-5 ft',
    startingRigSetup: euroRig,
    startingTechnique: 'Euro Nymphing',
    riverName: 'Middle Provo River',
    hypothesis: 'A slimmer dark perdigon should convert better than the bulkier Frenchie in fast water.',
    notes: 'Ran equal drifts through the same bucket seams.'
  });
  await createDemoSessionGroupShare(demoUserId, runExperimentSessionId, demoGroup.id);

  const runExperimentEntries = makeExperimentEntries(
    frenchie,
    blackPerdigon,
    {
      casts: 22,
      catches: 2,
      species: ['Brown', 'Brown'],
      sizes: [14, 15],
      timestamps: [iso('2026-04-19T09:42:00-06:00'), iso('2026-04-19T10:11:00-06:00')]
    },
    {
      casts: 22,
      catches: 6,
      species: ['Brown', 'Rainbow', 'Brown', 'Brown', 'Rainbow', 'Cutthroat'],
      sizes: [15, 16.5, 14.5, 17, 15, 13.5],
      timestamps: [
        iso('2026-04-19T09:28:00-06:00'),
        iso('2026-04-19T09:37:00-06:00'),
        iso('2026-04-19T09:55:00-06:00'),
        iso('2026-04-19T10:03:00-06:00'),
        iso('2026-04-19T10:36:00-06:00'),
        iso('2026-04-19T10:49:00-06:00')
      ]
    }
  );
  await createExperiment({
    userId: demoUserId,
    sessionId: runExperimentSessionId,
    hypothesis: 'Slim dark patterns will separate better in the fast slot.',
    controlFocus: 'pattern',
    waterType: 'run',
    technique: 'Euro Nymphing',
    rigSetup: euroRig,
    flyEntries: runExperimentEntries,
    controlFly: frenchie,
    variantFly: blackPerdigon,
    controlCasts: 22,
    controlCatches: 2,
    variantCasts: 22,
    variantCatches: 6,
    winner: 'Test Fly',
    outcome: 'decisive',
    status: 'complete',
    confidenceScore: 0.88
  });

  const glideExperimentSessionId = await createSession({
    userId: demoUserId,
    date: iso('2026-04-18T16:10:00-06:00'),
    mode: 'experiment',
    startAt: iso('2026-04-18T16:10:00-06:00'),
    endedAt: iso('2026-04-18T17:45:00-06:00'),
    waterType: 'glide',
    depthRange: '1.5-3 ft',
    startingRigSetup: dryDropperRig,
    startingTechnique: 'Dry Dropper',
    riverName: 'Lower Green River',
    hypothesis: 'In softer glides, a visible dry should outperform the caddis imitation once the surface film stabilizes.',
    notes: 'Visibility and confidence mattered more than pure imitation here.'
  });
  await createDemoSessionGroupShare(demoUserId, glideExperimentSessionId, demoGroup.id);

  const glideExperimentEntries = makeExperimentEntries(
    adams,
    cdcCaddis,
    {
      casts: 18,
      catches: 4,
      species: ['Rainbow', 'Brown', 'Brown', 'Cutthroat'],
      sizes: [13.5, 14, 15, 12.5],
      timestamps: [
        iso('2026-04-18T16:24:00-06:00'),
        iso('2026-04-18T16:43:00-06:00'),
        iso('2026-04-18T17:01:00-06:00'),
        iso('2026-04-18T17:22:00-06:00')
      ]
    },
    {
      casts: 18,
      catches: 1,
      species: ['Brown'],
      sizes: [13],
      timestamps: [iso('2026-04-18T16:55:00-06:00')]
    }
  );
  await createExperiment({
    userId: demoUserId,
    sessionId: glideExperimentSessionId,
    hypothesis: 'The easier-to-track Adams should hold an edge in softer glides.',
    controlFocus: 'pattern',
    waterType: 'glide',
    technique: 'Dry Dropper',
    rigSetup: dryDropperRig,
    flyEntries: glideExperimentEntries,
    controlFly: adams,
    variantFly: cdcCaddis,
    controlCasts: 18,
    controlCatches: 4,
    variantCasts: 18,
    variantCatches: 1,
    winner: 'Baseline Fly',
    outcome: 'decisive',
    status: 'complete',
    confidenceScore: 0.76
  });

  const competition = await createCompetition({
    organizerUserId: demoUserId,
    name: 'Evening Pocket Water Shootout',
    groupCount: 2,
    sessionCount: 1
  });
  const compGroupA = await createCompetitionGroup({ competitionId: competition.id, label: 'A', sortOrder: 1 });
  const compGroupB = await createCompetitionGroup({ competitionId: competition.id, label: 'B', sortOrder: 2 });
  const compSession = await createCompetitionSession({
    competitionId: competition.id,
    sessionNumber: 1,
    startTime: '17:30',
    endTime: '19:00'
  });
  await createCompetitionParticipant({ competitionId: competition.id, userId: demoUserId });
  await createCompetitionParticipant({ competitionId: competition.id, userId: teammateUserId });

  const competitionSessionId = await createSession({
    userId: demoUserId,
    date: iso('2026-04-17T17:30:00-06:00'),
    mode: 'competition',
    startAt: iso('2026-04-17T17:30:00-06:00'),
    endedAt: iso('2026-04-17T19:00:00-06:00'),
    waterType: 'pocket water',
    depthRange: '1.5-3 ft',
    competitionId: competition.id,
    competitionGroupId: compGroupA.id,
    competitionSessionId: compSession.id,
    competitionAssignedGroup: compGroupA.label,
    competitionRole: 'fishing',
    competitionBeat: 'Pocket 3',
    competitionSessionNumber: 1,
    competitionRequiresMeasurement: false,
    competitionLengthUnit: 'mm',
    startingRigSetup: dryDropperRig,
    startingTechnique: 'Dry Dropper',
    riverName: 'Middle Provo River',
    notes: 'Fast evening round where pocket water and quick shot placement won.'
  });
  await createDemoSessionGroupShare(demoUserId, competitionSessionId, demoGroup.id);
  await upsertCompetitionAssignment({
    competitionId: competition.id,
    userId: demoUserId,
    competitionGroupId: compGroupA.id,
    competitionSessionId: compSession.id,
    beat: 'Pocket 3',
    role: 'fishing',
    sessionId: competitionSessionId
  });
  await upsertCompetitionAssignment({
    competitionId: competition.id,
    userId: teammateUserId,
    competitionGroupId: compGroupB.id,
    competitionSessionId: compSession.id,
    beat: 'Pocket 5',
    role: 'controlling',
    sessionId: undefined
  });
  for (const event of [
    {
      sessionId: competitionSessionId,
      mode: 'competition' as const,
      flyName: adams.name,
      flySnapshot: adams,
      species: 'Brown' as TroutSpecies,
      lengthUnit: 'mm' as const,
      caughtAt: iso('2026-04-17T17:51:00-06:00')
    },
    {
      sessionId: competitionSessionId,
      mode: 'competition' as const,
      flyName: pinkTag.name,
      flySnapshot: pinkTag,
      species: 'Rainbow' as TroutSpecies,
      lengthUnit: 'mm' as const,
      caughtAt: iso('2026-04-17T18:13:00-06:00')
    }
  ]) {
    await createCatchEvent({ userId: demoUserId, ...event });
  }

  const teammateSessionId = await createSession({
    userId: teammateUserId,
    date: iso('2026-04-16T10:20:00-06:00'),
    mode: 'experiment',
    startAt: iso('2026-04-16T10:20:00-06:00'),
    endedAt: iso('2026-04-16T11:35:00-06:00'),
    waterType: 'run',
    depthRange: '3-5 ft',
    startingRigSetup: pinkEuroRig,
    startingTechnique: 'Euro Nymphing',
    riverName: 'Middle Provo River',
    hypothesis: 'Pink-tag accents will help in the overcast run.',
    notes: 'Useful supporting context from a teammate on a similar seam.'
  });
  await createDemoSessionGroupShare(teammateUserId, teammateSessionId, demoGroup.id);
  await createExperiment({
    userId: teammateUserId,
    sessionId: teammateSessionId,
    hypothesis: 'Pink-tag accents should show better than the Frenchie in low light.',
    controlFocus: 'bead color',
    waterType: 'run',
    technique: 'Euro Nymphing',
    rigSetup: pinkEuroRig,
    flyEntries: makeExperimentEntries(
      frenchie,
      pinkTag,
      {
        casts: 16,
        catches: 2,
        species: ['Brown', 'Brown'],
        sizes: [13.5, 14.5],
        timestamps: [iso('2026-04-16T10:46:00-06:00'), iso('2026-04-16T11:04:00-06:00')]
      },
      {
        casts: 16,
        catches: 4,
        species: ['Brown', 'Rainbow', 'Brown', 'Rainbow'],
        sizes: [14, 15, 13, 16],
        timestamps: [
          iso('2026-04-16T10:33:00-06:00'),
          iso('2026-04-16T10:54:00-06:00'),
          iso('2026-04-16T11:12:00-06:00'),
          iso('2026-04-16T11:24:00-06:00')
        ]
      }
    ),
    controlFly: frenchie,
    variantFly: pinkTag,
    controlCasts: 16,
    controlCatches: 2,
    variantCasts: 16,
    variantCatches: 4,
    winner: 'Test Fly',
    outcome: 'decisive',
    status: 'complete',
    confidenceScore: 0.71
  });

  return demoUserId;
};

const finishDemoBootstrap = async (activeUserId: number): Promise<DemoBootstrapResult> => {
  await setActiveUserId(activeUserId);
  const users = await listUsers();
  return {
    users,
    activeUserId
  };
};

export const ensureWebDemoBootstrap = async (): Promise<DemoBootstrapResult | null> => {
  if (!isWebDemoModeEnabled()) return null;

  await initDb();
  const existingSeedVersion = await getAppSetting(WEB_DEMO_SEED_VERSION_KEY);
  const existingUsers = await listUsers();
  if (existingSeedVersion === WEB_DEMO_SEED_VERSION && existingUsers.length) {
    const storedActiveUserId = await getActiveUserId();
    const nextActiveUserId = existingUsers.some((user) => user.id === storedActiveUserId)
      ? (storedActiveUserId as number)
      : existingUsers[0].id;
    return finishDemoBootstrap(nextActiveUserId);
  }

  return resetWebDemoSandbox();
};

export const resetWebDemoSandbox = async (): Promise<DemoBootstrapResult> => {
  if (!isWebDemoModeEnabled()) {
    throw new Error('Web demo reset is only available in web demo mode.');
  }

  clearWebValuesByPrefix('fishing_lab.');
  await initDb();
  const demoUserId = await seedDemoData();
  await setAppSetting(WEB_DEMO_SEED_VERSION_KEY, WEB_DEMO_SEED_VERSION);
  return finishDemoBootstrap(demoUserId);
};
