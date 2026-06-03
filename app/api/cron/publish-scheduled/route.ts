import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publishPost } from "@/lib/linkedin";

// Called by an external cron (e.g. cURL every 5 min, or Vercel Cron)
// Protect with a shared secret
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const due = await prisma.socialPost.findMany({
    where: {
      status: "scheduled",
      scheduledAt: { lte: now },
      platform: "linkedin",
    },
  });

  const results = [];
  for (const post of due) {
    try {
      const result = await publishPost(post.content, post.imageUrl ?? undefined);
      await prisma.socialPost.update({
        where: { id: post.id },
        data: { status: "published", publishedAt: now, linkedinPostId: result.id },
      });
      results.push({ id: post.id, status: "published" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await prisma.socialPost.update({
        where: { id: post.id },
        data: { status: "failed", errorMessage: msg },
      });
      results.push({ id: post.id, status: "failed", error: msg });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
