import { Session } from '@/types/session';

export type FishingStyle = 'fly' | 'spin_bait' | 'boat_trolling';

export type FishingStyleMethod = string;

export interface FishingStyleOption {
  key: FishingStyle;
  title: string;
  shortTitle: string;
  description: string;
  methods: FishingStyleMethod[];
}

export interface FishingStyleSetup {
  style: FishingStyle;
  method?: string;
  setupName?: string;
  tackleNotes?: string;
  saveSetup?: boolean;
}

export const FISHING_STYLE_OPTIONS: FishingStyleOption[] = [
  {
    key: 'fly',
    title: 'Fly Fishing',
    shortTitle: 'Fly',
    description: 'Use flies, rigging, water changes, experiments, and competition tools.',
    methods: ['Dry Fly', 'Dry Dropper', 'Euro Nymphing']
  },
  {
    key: 'spin_bait',
    title: 'Spin/Bait Fishing',
    shortTitle: 'Spin/Bait',
    description: 'Keep a simple journal for spinners, bait, jigs, spoons, and catch notes.',
    methods: ['Spinners', 'PowerBait', 'Jigging', 'Spoons', 'Bait Rig']
  },
  {
    key: 'boat_trolling',
    title: 'Boat/Trolling',
    shortTitle: 'Boat',
    description: 'Log boat methods like downriggers, trolling, vertical jigging, and casting.',
    methods: ['Downriggers', 'Trolling', 'Vertical Jigging', 'Casting From Boat']
  }
];

const SETUP_START = '[Fishing Lab Setup]';
const SETUP_END = '[/Fishing Lab Setup]';

export const getFishingStyleOption = (style: FishingStyle) =>
  FISHING_STYLE_OPTIONS.find((option) => option.key === style) ?? FISHING_STYLE_OPTIONS[0];

export const parseFishingStyleSetup = (notes?: string | null): FishingStyleSetup | null => {
  if (!notes) return null;
  const startIndex = notes.indexOf(SETUP_START);
  const endIndex = notes.indexOf(SETUP_END);
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) return null;
  const raw = notes.slice(startIndex + SETUP_START.length, endIndex).trim();
  const rows = raw.split('\n').map((row) => row.trim()).filter(Boolean);
  const values = Object.fromEntries(
    rows.map((row) => {
      const separatorIndex = row.indexOf(':');
      if (separatorIndex < 0) return [row, ''];
      return [row.slice(0, separatorIndex).trim(), row.slice(separatorIndex + 1).trim()];
    })
  );
  const style = values.style as FishingStyle | undefined;
  if (style !== 'fly' && style !== 'spin_bait' && style !== 'boat_trolling') return null;
  return {
    style,
    method: values.method || undefined,
    setupName: values.setupName || undefined,
    tackleNotes: values.tackle || undefined,
    saveSetup: values.saveSetup === 'true'
  };
};

export const stripFishingStyleSetupBlock = (notes?: string | null) => {
  if (!notes) return '';
  const startIndex = notes.indexOf(SETUP_START);
  const endIndex = notes.indexOf(SETUP_END);
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) return notes.trim();
  return `${notes.slice(0, startIndex)}${notes.slice(endIndex + SETUP_END.length)}`.trim();
};

export const serializeFishingStyleNotes = (notes: string, setup: FishingStyleSetup) => {
  const cleanNotes = stripFishingStyleSetupBlock(notes);
  const setupBlock = [
    SETUP_START,
    `style: ${setup.style}`,
    setup.method ? `method: ${setup.method}` : null,
    setup.setupName?.trim() ? `setupName: ${setup.setupName.trim().replace(/\s+/g, ' ')}` : null,
    setup.tackleNotes?.trim() ? `tackle: ${setup.tackleNotes.trim().replace(/\s+/g, ' ')}` : null,
    setup.saveSetup ? 'saveSetup: true' : null,
    SETUP_END
  ]
    .filter(Boolean)
    .join('\n');
  return [setupBlock, cleanNotes].filter(Boolean).join('\n\n');
};

export const getFishingStyleForSession = (session: Pick<Session, 'notes'> | null | undefined): FishingStyle =>
  parseFishingStyleSetup(session?.notes)?.style ?? 'fly';

export const describeFishingStyleSetup = (session: Pick<Session, 'notes'> | null | undefined) => {
  const setup = parseFishingStyleSetup(session?.notes);
  const option = getFishingStyleOption(setup?.style ?? 'fly');
  return {
    style: setup?.style ?? 'fly',
    styleLabel: option.title,
    method: setup?.method,
    setupName: setup?.setupName,
    tackleNotes: setup?.tackleNotes,
    saveSetup: setup?.saveSetup ?? false,
    journalNotes: stripFishingStyleSetupBlock(session?.notes)
  };
};
