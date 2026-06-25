import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOnlineSession } from "@/lib/onlineAuth";

export const dynamic = "force-dynamic";

// SSE stream of approved, non-hidden questions — polls DB every 3 seconds.
// Only accessible to authenticated online participants.
export async function GET() {
  const session = await getOnlineSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastId = 0;

      // Send initial snapshot
      const initial = await prisma.sessionQuestion.findMany({
        where: { approved: true, hidden: false },
        orderBy: { askedAt: "asc" },
        select: { id: true, body: true, displayName: true, answered: true, upvotes: true, askedAt: true },
      });
      if (initial.length > 0) {
        lastId = Math.max(...initial.map(q => q.id));
      }
      const initPayload = `data: ${JSON.stringify({ type: "snapshot", questions: initial })}\n\n`;
      controller.enqueue(encoder.encode(initPayload));

      // Poll every 3s for new approved questions
      const interval = setInterval(async () => {
        try {
          const newQuestions = await prisma.sessionQuestion.findMany({
            where: { approved: true, hidden: false, id: { gt: lastId } },
            orderBy: { askedAt: "asc" },
            select: { id: true, body: true, displayName: true, answered: true, upvotes: true, askedAt: true },
          });
          if (newQuestions.length > 0) {
            lastId = Math.max(...newQuestions.map(q => q.id));
            const payload = `data: ${JSON.stringify({ type: "new", questions: newQuestions })}\n\n`;
            controller.enqueue(encoder.encode(payload));
          }
          // Heartbeat
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(interval);
          controller.close();
        }
      }, 3000);

      // Clean up after 5 minutes — client reconnects
      setTimeout(() => {
        clearInterval(interval);
        try { controller.close(); } catch { /* already closed */ }
      }, 300_000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
