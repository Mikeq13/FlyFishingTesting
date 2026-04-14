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

  const valid = differingMajorVariables.length <= 1;

  return {
    valid,
    warning: valid
      ? undefined
      : `Baseline and test fly differ in ${differingMajorVariables.length} major variables (${differingMajorVariables.join(', ')}). Limit to one major variable for clean inference.`,
    differingMajorVariables
  };
};
