import { FlySetup } from '@/types/fly';
import { ExperimentControlFocus } from '@/types/experiment';

export interface ExperimentRuleCheck {
  valid: boolean;
  warning?: string;
  differingMajorVariables: string[];
}

const focusMap: Record<ExperimentControlFocus, string> = {
  pattern: 'pattern',
  'fly type': 'fly_type',
  'hook size': 'hook_size',
  tail: 'tail',
  collar: 'collar',
  'body type': 'body_type',
  'bead size': 'bead_size_mm',
  'bead color': 'bead_color',
  'number of flies': 'fly_count'
};

export const validateExperimentPair = (baselineFly: FlySetup, testFly: FlySetup, controlFocus: ExperimentControlFocus = 'pattern'): ExperimentRuleCheck => {
  const differingMajorVariables: string[] = [];

  if (baselineFly.name.trim().toLowerCase() !== testFly.name.trim().toLowerCase()) differingMajorVariables.push('pattern');
  if (baselineFly.intent !== testFly.intent) differingMajorVariables.push('fly_type');
  if (baselineFly.hookSize !== testFly.hookSize) differingMajorVariables.push('hook_size');
  if (baselineFly.beadSizeMm !== testFly.beadSizeMm) differingMajorVariables.push('bead_size_mm');
  if (baselineFly.beadColor !== testFly.beadColor) differingMajorVariables.push('bead_color');
  if (baselineFly.bodyType !== testFly.bodyType) differingMajorVariables.push('body_type');
  if (baselineFly.tail !== testFly.tail) differingMajorVariables.push('tail');
  if (baselineFly.collar !== testFly.collar) differingMajorVariables.push('collar');

  const expectedVariable = focusMap[controlFocus];
  const unexpectedVariables = differingMajorVariables.filter((variable) => variable !== expectedVariable);

  return {
    valid: true,
    warning:
      unexpectedVariables.length > 0
        ? `Baseline and test fly differ outside the chosen control focus (${controlFocus}): ${unexpectedVariables.join(', ')}. Results may be harder to interpret cleanly.`
        : differingMajorVariables.length > 1
        ? `Baseline and test fly differ in ${differingMajorVariables.length} major variables (${differingMajorVariables.join(', ')}). Results may be harder to interpret cleanly.`
        : undefined,
    differingMajorVariables
  };
};
