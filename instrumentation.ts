// This file runs once when the Next.js server starts (Node.js runtime only).
// It registers in-process cron jobs so the container needs no external scheduler.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Lazy-import to keep Edge runtime clean
  const cron = await import("node-cron");

  const secret = process.env.CRON_SECRET;
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  const call = (path: string) =>
    fetch(`${base}${path}?secret=${secret}`, { method: "GET" }).catch(() => {});

  // Publish scheduled social posts every 5 minutes
  cron.schedule("*/5 * * * *", () => {
    call("/api/cron/publish-scheduled");
  });

  // Cyber-watch: cleanup expired items + auto-fetch (if moderation off) every day at 07:00
  cron.schedule("0 7 * * *", () => {
    call("/api/cron/cyber-watch-cleanup");
  });

  // Cyber-watch: mid-day refresh at 13:00 (catches breaking news)
  cron.schedule("0 13 * * *", () => {
    call("/api/cron/cyber-watch-cleanup");
  });
}
