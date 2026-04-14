import { FlySetup } from '@/types/fly';

export interface ExperimentRuleCheck {
  valid: boolean;
  warning?: string;
  differingMajorVariables: string[];
}

export const validateExperimentPair = (controlFly: FlySetup, variantFly: FlySetup): ExperimentRuleCheck => {
  const differingMajorVariables: string[] = [];

  if (controlFly.intent !== variantFly.intent) differingMajorVariables.push('intent');
  if (controlFly.beadSizeMm !== variantFly.beadSizeMm) differingMajorVariables.push('bead_size_mm');

  const valid = differingMajorVariables.length <= 1;

  return {
    valid,
    warning: valid
      ? undefined
      : `Control and variant differ in ${differingMajorVariables.length} major variables (${differingMajorVariables.join(', ')}). Limit to one major variable for clean inference.`,
    differingMajorVariables
  };
};
