import { CatchEvent } from '@/types/activity';
import { Experiment } from '@/types/experiment';
import { FishingStyle } from '@/utils/fishingStyle';

export const FLY_SPECIES_OPTIONS = ['Rainbow', 'Brown', 'Brook', 'Cutthroat', 'Whitefish', 'Bass'];
export const SPIN_BAIT_SPECIES_OPTIONS = ['Bass', 'Rainbow Trout', 'Catfish', 'Bluegill', 'Walleye', 'Crappie'];
export const BOAT_TROLLING_SPECIES_OPTIONS = ['Kokanee Salmon', 'Lake Trout', 'Splake', 'Walleye', 'Bass', 'Rainbow Trout'];
export const GENERAL_SPECIES_OPTIONS = ['Rainbow Trout', 'Brown Trout', 'Bass', 'Catfish', 'Bluegill', 'Walleye'];

export const getRecommendedSpeciesForStyle = (style: FishingStyle = 'fly') => {
  if (style === 'spin_bait') return SPIN_BAIT_SPECIES_OPTIONS;
  if (style === 'boat_trolling') return BOAT_TROLLING_SPECIES_OPTIONS;
  return FLY_SPECIES_OPTIONS;
};

export const normalizeSpeciesName = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());

export const uniqueSpecies = (values: Array<string | null | undefined>) => {
  const seen = new Set<string>();
  return values
    .map((value) => (value ? normalizeSpeciesName(value) : ''))
    .filter((value) => {
      if (!value) return false;
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export const getRecentCatchSpecies = (events: CatchEvent[], limit = 6) =>
  uniqueSpecies(
    [...events]
      .filter((event) => !!event.species)
      .sort((left, right) => new Date(right.caughtAt).getTime() - new Date(left.caughtAt).getTime())
      .map((event) => event.species)
  ).slice(0, limit);

export const getRecentExperimentSpecies = (experiments: Experiment[], limit = 6) =>
  uniqueSpecies(
    experiments.flatMap((experiment) =>
      experiment.flyEntries.flatMap((entry) => entry.fishSpecies)
    )
  ).slice(0, limit);

export const buildSpeciesOptions = ({
  recommended,
  recent,
  selected
}: {
  recommended: string[];
  recent?: string[];
  selected?: string | null;
}) => uniqueSpecies([selected, ...(recent ?? []), ...recommended]);
