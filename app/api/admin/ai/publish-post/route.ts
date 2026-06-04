import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { publishPost as publishLinkedIn } from "@/lib/linkedin";
import { publishTweet } from "@/lib/twitter";

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, scheduledAt } = await req.json();

  const post = await prisma.socialPost.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  if (post.platform !== "linkedin" && post.platform !== "twitter") {
    return NextResponse.json({ error: `Platform "${post.platform}" publishing not yet supported` }, { status: 400 });
  }

  // Schedule mode — platform-agnostic
  if (scheduledAt) {
    const updated = await prisma.socialPost.update({
      where: { id },
      data: { scheduledAt: new Date(scheduledAt), status: "scheduled" },
    });
    return NextResponse.json(updated);
  }

  // Publish now
  try {
    let postId: string;
    let postUrl: string;

    if (post.platform === "linkedin") {
      const result = await publishLinkedIn(post.content, post.imageUrl ?? undefined);
      postId = result.id;
      postUrl = result.url;
    } else {
      const result = await publishTweet(post.content, post.imageUrl ?? undefined);
      postId = result.id;
      postUrl = result.url;
    }

    const updated = await prisma.socialPost.update({
      where: { id },
      data: { status: "published", publishedAt: new Date(), linkedinPostId: postId },
    });
    return NextResponse.json({ ...updated, postUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.socialPost.update({
      where: { id },
      data: { status: "failed", errorMessage: msg },
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
