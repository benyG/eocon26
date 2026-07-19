// Datetime-aware "CTF holding window" logic. Unlike the date-only registration/CFP
// windows (evaluateCfpWindow), the CTF runs on precise start/end datetimes
// (e.g. 2026-11-20T20:00 → 2026-11-22T20:00), so we compare on full timestamps.
//
// The stored settings are datetime-local strings without a timezone offset. They are
// interpreted in the server's local time (the deployment runs in the event timezone,
// Douala/WAT). Absolute epoch milliseconds are exported so the browser can render a
// timezone-agnostic live countdown.

export interface CtfWindowState {
  hasWindow: boolean;                              // both bounds set and coherent
  phase: "before" | "during" | "after" | "none";  // "none" = no usable window
  progress: number;                                // 0..1 elapsed within the window
  startMs: number | null;
  endMs: number | null;
  nowMs: number;
}

export function evaluateCtfWindow(
  start: string | undefined | null,
  end: string | undefined | null,
  now: Date = new Date(),
): CtfWindowState {
  const s = (start || "").trim();
  const e = (end || "").trim();
  const startD = s ? new Date(s) : null;
  const endD = e ? new Date(e) : null;
  const startMs = startD && !isNaN(startD.getTime()) ? startD.getTime() : null;
  const endMs = endD && !isNaN(endD.getTime()) ? endD.getTime() : null;
  const nowMs = now.getTime();

  const hasWindow = startMs != null && endMs != null && endMs > startMs;
  if (!hasWindow) return { hasWindow: false, phase: "none", progress: 0, startMs, endMs, nowMs };

  let phase: "before" | "during" | "after";
  let progress: number;
  if (nowMs < (startMs as number)) { phase = "before"; progress = 0; }
  else if (nowMs > (endMs as number)) { phase = "after"; progress = 1; }
  else { phase = "during"; progress = (nowMs - (startMs as number)) / ((endMs as number) - (startMs as number)); }

  return { hasWindow: true, phase, progress, startMs, endMs, nowMs };
}
