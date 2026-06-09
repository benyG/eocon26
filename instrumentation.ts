// Runs once at server startup (Node.js runtime only — not Edge, not client).
// Replaces any external cron service: the container schedules its own jobs.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const secret = process.env.CRON_SECRET ?? "";
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  const call = (path: string) =>
    fetch(`${base}${path}?secret=${encodeURIComponent(secret)}`)
      .catch(() => {/* network errors are silently ignored */});

  // ── Every 5 min: publish due social posts ──────────────────────────────────
  setInterval(() => call("/api/cron/publish-scheduled"), 5 * 60 * 1000);

  // ── Daily at a fixed hour: cyber-watch cleanup + auto-fetch ───────────────
  const scheduleDailyAt = (hour: number, job: () => void) => {
    const msUntilNext = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(hour, 0, 0, 0);
      if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
      return next.getTime() - now.getTime();
    };
    const arm = () => setTimeout(() => { job(); arm(); }, msUntilNext());
    arm();
  };

  scheduleDailyAt(7,  () => call("/api/cron/cyber-watch-cleanup"));
  scheduleDailyAt(13, () => call("/api/cron/cyber-watch-cleanup"));
}
