/**
 * Computes CPE (Continuing Professional Education) credits from total minutes attended.
 * Rules: full hour = 1 CPE; 50–59 min remainder = 1 CPE; 1–49 min remainder = 0.5 CPE; 0 = 0.
 */
export function computeCPE(totalMinutes: number): number {
  const hours = Math.floor(totalMinutes / 60);
  const rem = totalMinutes % 60;
  return hours + (rem >= 50 ? 1 : rem > 0 ? 0.5 : 0);
}
