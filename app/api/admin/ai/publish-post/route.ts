import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { publishPost } from "@/lib/linkedin";

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, scheduledAt } = await req.json();

  const post = await prisma.socialPost.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.platform !== "linkedin") return NextResponse.json({ error: "Only LinkedIn publishing is supported" }, { status: 400 });

  // Schedule mode
  if (scheduledAt) {
    const updated = await prisma.socialPost.update({
      where: { id },
      data: { scheduledAt: new Date(scheduledAt), status: "scheduled" },
    });
    return NextResponse.json(updated);
  }

  // Publish now
  try {
    const result = await publishPost(post.content, post.imageUrl ?? undefined);
    const updated = await prisma.socialPost.update({
      where: { id },
      data: {
        status: "published",
        publishedAt: new Date(),
        linkedinPostId: result.id,
      },
    });
    return NextResponse.json({ ...updated, linkedinUrl: result.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.socialPost.update({
      where: { id },
      data: { status: "failed", errorMessage: msg },
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
