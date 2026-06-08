import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Called by external cron daily: GET /api/cron/cyber-watch-cleanup?secret=CRON_SECRET
// Cleans up expired cyber watch items, old audit logs, and auto-fetches when moderation is off.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Purge expired cyber watch items (expiresAt in the past)
  const { count: watchPurged } = await prisma.cyberWatchItem.deleteMany({
    where: {
      expiresAt: { lte: new Date() },
      status: { in: ["pending", "rejected"] },
    },
  });

  // 2. Purge audit logs older than 90 days
  const auditCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const { count: auditPurged } = await prisma.auditLog.deleteMany({
    where: { createdAt: { lte: auditCutoff } },
  });

  // 3. Purge expired/revoked admin sessions older than 7 days
  const sessionCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const { count: sessionsPurged } = await prisma.adminSession.deleteMany({
    where: { expiresAt: { lte: sessionCutoff } },
  });

  // 4. Auto-fetch + auto-schedule if moderation is disabled
  const settingsRow = await prisma.eventSetting.findUnique({ where: { key: "cyber_watch_settings" } });
  const settings = settingsRow ? JSON.parse(settingsRow.value) : {};

  let autoScheduled = 0;
  if (settings.enabled && !settings.moderation) {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // Trigger fetch
    await fetch(`${baseUrl}/api/admin/cyber-watch/fetch`, {
      method: "POST",
      headers: { Cookie: `admin_token=internal-cron` },
    }).catch(() => {});

    // Auto-approve best pending items up to dailyCount
    const dailyCount: number = settings.dailyCount ?? 2;
    const pending = await prisma.cyberWatchItem.findMany({
      where: { status: "pending" },
      orderBy: { aiScore: "desc" },
      take: dailyCount,
    });

    for (const item of pending) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0);

      const platforms = item.platforms.split(",").map(p => p.trim()).filter(Boolean);
      for (const platform of platforms) {
        for (const lang of ["fr", "en"] as const) {
          await prisma.socialPost.create({
            data: {
              brief: `[Veille cyber] ${item.title}`,
              platform,
              lang,
              content: lang === "fr" ? item.draftFr : item.draftEn,
              status: "scheduled",
              scheduledAt: tomorrow,
              contentType: "custom",
            },
          });
        }
      }
      await prisma.cyberWatchItem.update({
        where: { id: item.id },
        data: { status: "scheduled", scheduledAt: tomorrow },
      });
      autoScheduled++;
    }
  }

  return NextResponse.json({ watchPurged, auditPurged, sessionsPurged, autoScheduled });
}
