import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { getCurrentAdminFlags, createApprovalRequest } from "@/lib/approvals";
import { publishPost as publishLinkedIn } from "@/lib/linkedin";
import { publishTweet } from "@/lib/twitter";
import { publishFacebookPost } from "@/lib/facebook";
import { publishInstagramPost } from "@/lib/instagram";
import { publishWhatsAppMessage } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Instagram container polling can take up to ~30s

export async function POST(req: NextRequest) {
  if (!(await hasPermission("communication", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, scheduledAt } = await req.json();

  const post = await prisma.socialPost.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const SUPPORTED = ["linkedin", "twitter", "facebook", "instagram", "whatsapp"];
  if (!SUPPORTED.includes(post.platform)) {
    return NextResponse.json({ error: `Platform "${post.platform}" publishing not yet supported` }, { status: 400 });
  }

  // Validation constraint: hold the post for approval instead of publishing /
  // scheduling it directly. We still record the intended scheduledAt on the post
  // so the approver keeps the requested date; the cron only picks up posts whose
  // status is "scheduled", so a "pending_approval" post never goes out on its own.
  const flags = await getCurrentAdminFlags();
  if (flags?.requiresApproval) {
    const excerpt = post.content.slice(0, 60).replace(/\s+/g, " ").trim();
    await prisma.socialPost.update({
      where: { id },
      data: {
        status: "pending_approval",
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
      },
    });
    await createApprovalRequest({
      kind: "social",
      action: scheduledAt ? "schedule" : "publish",
      targetType: "SocialPost",
      targetId: id,
      title: `${post.platform} · « ${excerpt}${post.content.length > 60 ? "…" : ""} »`,
      payload: scheduledAt ? { scheduledAt } : null,
      requestedBy: flags.email,
    });
    return NextResponse.json({ held: true, message: "Soumis à validation avant publication." }, { status: 202 });
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
    } else if (post.platform === "facebook") {
      const result = await publishFacebookPost(post.content, post.imageUrl ?? undefined);
      postId = result.id;
      postUrl = result.url;
    } else if (post.platform === "instagram") {
      if (!post.imageUrl) throw new Error("Instagram requires an image (imageUrl missing)");
      const result = await publishInstagramPost(post.content, post.imageUrl);
      postId = result.id;
      postUrl = result.url;
    } else if (post.platform === "whatsapp") {
      const result = await publishWhatsAppMessage(post.content, post.imageUrl ?? undefined);
      postId = result.id;
      postUrl = result.url;
    } else {
      const result = await publishTweet(post.content, post.imageUrl ?? undefined);
      postId = result.id;
      postUrl = result.url;
    }

    const updated = await prisma.socialPost.update({
      where: { id },
      data: { status: "published", publishedAt: new Date(), linkedinPostId: postId, postUrl },
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
