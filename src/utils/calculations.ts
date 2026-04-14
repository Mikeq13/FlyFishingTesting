export const catchRate = (catches: number, casts: number): number => {
  if (casts <= 0) return 0;
  return catches / casts;
};

export const rateDiff = (a: number, b: number): number => Math.abs(b - a);

export const percentDiff = (a: number, b: number): number => {
  if (a === 0 && b === 0) return 0;
  const baseline = Math.max(Math.abs(a), 0.0001);
  return Math.abs((b - a) / baseline);
};

export const confidenceFromSamples = (n: number): 'low' | 'medium' | 'high' => {
  if (n >= 60) return 'high';
  if (n >= 25) return 'medium';
  return 'low';
};
