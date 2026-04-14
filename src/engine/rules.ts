import { FlySetup } from '@/types/fly';

export interface ExperimentRuleCheck {
  valid: boolean;
  warning?: string;
  differingMajorVariables: string[];
}

export const validateExperimentPair = (baselineFly: FlySetup, testFly: FlySetup): ExperimentRuleCheck => {
  const differingMajorVariables: string[] = [];

  if (baselineFly.intent !== testFly.intent) differingMajorVariables.push('fly_type');
  if (baselineFly.beadSizeMm !== testFly.beadSizeMm) differingMajorVariables.push('bead_size_mm');

  return {
    valid: true,
    warning:
      differingMajorVariables.length > 1
        ? `Baseline and test fly differ in ${differingMajorVariables.length} major variables (${differingMajorVariables.join(', ')}). Results may be harder to interpret cleanly.`
        : undefined,
    differingMajorVariables
  };
};
