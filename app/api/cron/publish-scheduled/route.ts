import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publishPost as publishLinkedIn } from "@/lib/linkedin";
import { publishTweet } from "@/lib/twitter";
import { publishFacebookPost } from "@/lib/facebook";
import { publishInstagramPost } from "@/lib/instagram";
import { publishWhatsAppMessage } from "@/lib/whatsapp";

// Called by an external cron (e.g. cURL every 5 min, or Vercel Cron)
// Protect with a shared secret: GET /api/cron/publish-scheduled?secret=CRON_SECRET
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
      platform: { in: ["linkedin", "twitter", "facebook", "instagram", "whatsapp"] },
    },
  });

  const results = [];
  for (const post of due) {
    try {
      let postId: string;
      if (post.platform === "linkedin") {
        const r = await publishLinkedIn(post.content, post.imageUrl ?? undefined);
        postId = r.id;
      } else if (post.platform === "facebook") {
        const r = await publishFacebookPost(post.content, post.imageUrl ?? undefined);
        postId = r.id;
      } else if (post.platform === "instagram") {
        if (!post.imageUrl) throw new Error("Instagram requires imageUrl");
        const r = await publishInstagramPost(post.content, post.imageUrl);
        postId = r.id;
      } else if (post.platform === "whatsapp") {
        const r = await publishWhatsAppMessage(post.content, post.imageUrl ?? undefined);
        postId = r.id;
      } else {
        const r = await publishTweet(post.content, post.imageUrl ?? undefined);
        postId = r.id;
      }
      await prisma.socialPost.update({
        where: { id: post.id },
        data: { status: "published", publishedAt: now, linkedinPostId: postId },
      });
      results.push({ id: post.id, platform: post.platform, status: "published" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await prisma.socialPost.update({
        where: { id: post.id },
        data: { status: "failed", errorMessage: msg },
      });
      results.push({ id: post.id, platform: post.platform, status: "failed", error: msg });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
