export function estimateReductionPercent(rawChars: number, finalChars: number): number {
  if (rawChars <= 0) {
    return 0;
  }

  const reduction = ((rawChars - finalChars) / rawChars) * 100;
  return Math.max(0, Math.min(100, Math.round(reduction)));
}
