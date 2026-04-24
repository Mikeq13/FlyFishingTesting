import { WaterType } from '@/types/session';

export interface WaterTypePlaybookEntry {
  waterType: WaterType;
  title: string;
  beginnerRead: string;
  whereFishHold: string;
  recommendedApproach: string;
  flyAndRigNotes: string;
  commonMistake: string;
  whatToLog: string;
}

export const WATER_TYPE_PLAYBOOK: Record<WaterType, WaterTypePlaybookEntry> = {
  riffle: {
    waterType: 'riffle',
    title: 'Riffle',
    beginnerRead: 'Broken, oxygen-rich water where trout can feed with cover and confidence.',
    whereFishHold: 'Look for soft pockets behind rocks, edges where fast water slows, and the tailout below the chop.',
    recommendedApproach: 'Fish close first, keep casts short, and drift through one lane at a time before stepping forward.',
    flyAndRigNotes: 'Dry dropper and euro nymphing both work well. Use enough weight or dropper depth to stay near the feeding lane.',
    commonMistake: 'Wading into the best near-bank water before fishing it.',
    whatToLog: 'Lane, depth, fly depth, first drift quality, and whether fish ate near the head or tail of the riffle.'
  },
  run: {
    waterType: 'run',
    title: 'Run',
    beginnerRead: 'A steady moving conveyor belt where trout can hold and feed without fighting heavy current.',
    whereFishHold: 'Focus on current seams, softer inside edges, subtle buckets, and the transition into the tailout.',
    recommendedApproach: 'Start with the seam closest to you, extend casts only after clean drifts, and adjust depth before changing flies.',
    flyAndRigNotes: 'Nymph rigs and dry droppers are strong starting points. Match weight and indicator depth to the run before swapping patterns.',
    commonMistake: 'Changing flies too early when the drift depth or speed is the real issue.',
    whatToLog: 'Seam, depth, drift speed, technique, fly pair, and whether the take came early, mid-run, or near the tail.'
  },
  glide: {
    waterType: 'glide',
    title: 'Glide',
    beginnerRead: 'Smooth, slower water where trout get more time to inspect both the fly and the presentation.',
    whereFishHold: 'Watch foam lines, shade edges, weed edges, and slow shelves where food collects.',
    recommendedApproach: 'Lengthen leaders, reduce splash, lead the fish, and prioritize drag-free presentation over covering water quickly.',
    flyAndRigNotes: 'Dry flies, emergers, and lighter nymphs can shine. Use smaller flies or finer tippet when refusals show up.',
    commonMistake: 'Casting too close or too often before reading the fish and current.',
    whatToLog: 'Rise form, leader length, fly size, refusal behavior, and whether a lighter presentation changed the response.'
  },
  pool: {
    waterType: 'pool',
    title: 'Pool',
    beginnerRead: 'Deeper, slower holding water that can reward patience and careful depth changes.',
    whereFishHold: 'Check the head where food enters, the drop into deeper water, structure edges, and the pool tail at low light.',
    recommendedApproach: 'Fish the head first, test depth methodically, and avoid lining fish in the slower center.',
    flyAndRigNotes: 'Nymphs, streamers, and suspended dry droppers can all fit. Depth control matters more than constant fly changes.',
    commonMistake: 'Only fishing the deepest middle and ignoring the head, edges, and tail.',
    whatToLog: 'Pool zone, estimated depth, sink time or rig depth, retrieve or drift style, and where the eat happened.'
  },
  'pocket water': {
    waterType: 'pocket water',
    title: 'Pocket Water',
    beginnerRead: 'Fast broken water with small soft spots where trout sit close to current breaks.',
    whereFishHold: 'Target cushions in front of rocks, soft water behind rocks, side seams, and tiny buckets between current tongues.',
    recommendedApproach: 'Use short casts, high-stick when possible, and make a few accurate drifts before moving to the next pocket.',
    flyAndRigNotes: 'Euro nymphing and compact dry droppers are useful. Choose flies that get noticed quickly in turbulent water.',
    commonMistake: 'Making long casts that drag instantly through several conflicting currents.',
    whatToLog: 'Pocket type, cast distance, weight/depth, fly visibility, and whether fish responded on the first few drifts.'
  },
  lake: {
    waterType: 'lake',
    title: 'Lake',
    beginnerRead: 'Stillwater where trout movement, depth, wind, and food lanes matter more than river current.',
    whereFishHold: 'Look for drop-offs, weed edges, wind lanes, inlets, outlets, shade, and cruising fish.',
    recommendedApproach: 'Pick a depth zone, count down consistently, and change retrieve speed before changing the whole setup.',
    flyAndRigNotes: 'Streamers, chironomids, leeches, and stillwater nymphs all fit. Let wind and visible feeding guide the first choice.',
    commonMistake: 'Random casting without tracking depth, countdown, or retrieve speed.',
    whatToLog: 'Depth zone, countdown, retrieve speed, wind direction, fly type, and whether fish were cruising or holding.'
  }
};

export const getWaterTypePlaybookEntry = (waterType?: WaterType | null) =>
  waterType ? WATER_TYPE_PLAYBOOK[waterType] : WATER_TYPE_PLAYBOOK.run;

