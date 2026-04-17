export const sizeBandLabel = (size: number): string => {
  if (size < 12) return '8-11"';
  if (size < 16) return '12-15"';
  if (size < 20) return '16-19"';
  return '20-24"';
};

export const formatExactFlyOption = (
  flyName: string,
  hookSize: number,
  beadSizeMm: number,
  beadColor: string,
  bugFamily: string,
  bugStage: string
) => `${flyName} | #${hookSize} | ${beadColor} ${beadSizeMm} bead | ${bugFamily} | ${bugStage}`;

export const toExactFlyKey = (
  flyName: string,
  hookSize: number,
  beadSizeMm: number,
  beadColor: string,
  bugFamily: string,
  bugStage: string
) => formatExactFlyOption(flyName.trim(), hookSize, beadSizeMm, beadColor, bugFamily, bugStage).toLowerCase();
