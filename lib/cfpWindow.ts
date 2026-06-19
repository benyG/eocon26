// Shared CFP submission-window logic used by both the public API (enforcement)
// and the front-end modal (UX banner).
//
// Window semantics:
//   - open date is inclusive from 00:00 of that day
//   - close date is inclusive through 23:59:59 of that day
//   - empty/unset dates mean "no bound on that side"
// A submission made outside the window is still accepted, but flagged as
// `deferred` and kept for a later edition rather than entering the active pipeline.

export interface CfpWindowState {
  open: boolean;        // true if submissions for the current edition are open right now
  hasWindow: boolean;   // true if at least one bound is configured
  openDate: string;     // raw setting value (may be "")
  closeDate: string;    // raw setting value (may be "")
}

export function evaluateCfpWindow(
  openDate: string | undefined | null,
  closeDate: string | undefined | null,
  now: Date = new Date(),
): CfpWindowState {
  const o = (openDate || "").trim();
  const c = (closeDate || "").trim();
  const hasWindow = !!o || !!c;

  let open = true;
  if (o) {
    const start = new Date(`${o}T00:00:00`);
    if (!isNaN(start.getTime()) && now < start) open = false;
  }
  if (c) {
    const end = new Date(`${c}T23:59:59`);
    if (!isNaN(end.getTime()) && now > end) open = false;
  }

  return { open, hasWindow, openDate: o, closeDate: c };
}
