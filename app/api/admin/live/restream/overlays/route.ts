import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";
import {
  listCaptions, createCaption, updateCaption, deleteCaption,
  listTickers, createTicker, updateTicker, deleteTicker,
} from "@/lib/restream";

export const dynamic = "force-dynamic";

async function getToken(): Promise<string> {
  const row = await prisma.eventSetting.findUnique({ where: { key: "restream_access_token" } });
  if (!row?.value) throw new Error("Token Restream non configuré — allez dans Étape 1 > Configuration Restream");
  return row.value;
}

// GET — liste toutes les captions et tickers existants
export async function GET() {
  if (!(await hasPermission("live", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const token = await getToken();
    const [captions, tickers] = await Promise.all([listCaptions(token), listTickers(token)]);
    return NextResponse.json({ captions, tickers });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) });
  }
}

// POST — actions : create_caption, update_caption, delete_caption,
//                  create_ticker, update_ticker, delete_ticker,
//                  bulk_speaker, bulk_all
export async function POST(req: NextRequest) {
  if (!(await hasPermission("live", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { action } = body as { action: string; [k: string]: unknown };

  try {
    const token = await getToken();

    // ── Caption CRUD ──────────────────────────────────────────────────────────

    if (action === "create_caption") {
      const cap = await createCaption(token, String(body.text ?? ""), body.secondaryText ? String(body.secondaryText) : undefined);
      logAction(req, "CREATE", "restream_caption", cap.id, { text: cap.text });
      return NextResponse.json(cap);
    }

    if (action === "update_caption") {
      await updateCaption(token, Number(body.id), {
        ...(body.text !== undefined ? { text: String(body.text) } : {}),
        ...(body.secondaryText !== undefined ? { secondaryText: String(body.secondaryText) } : {}),
        ...(body.active !== undefined ? { active: Boolean(body.active) } : {}),
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_caption") {
      await deleteCaption(token, Number(body.id));
      logAction(req, "DELETE", "restream_caption", Number(body.id), {});
      return NextResponse.json({ ok: true });
    }

    // ── Ticker CRUD ───────────────────────────────────────────────────────────

    if (action === "create_ticker") {
      const tick = await createTicker(token, String(body.text ?? ""));
      logAction(req, "CREATE", "restream_ticker", tick.id, { text: tick.text });
      return NextResponse.json(tick);
    }

    if (action === "update_ticker") {
      await updateTicker(token, Number(body.id), {
        ...(body.text !== undefined ? { text: String(body.text) } : {}),
        ...(body.active !== undefined ? { active: Boolean(body.active) } : {}),
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_ticker") {
      await deleteTicker(token, Number(body.id));
      logAction(req, "DELETE", "restream_ticker", Number(body.id), {});
      return NextResponse.json({ ok: true });
    }

    // ── Bulk : 1 speaker ─────────────────────────────────────────────────────

    if (action === "bulk_speaker") {
      const speaker = await prisma.speaker.findUnique({ where: { id: Number(body.speakerId) } });
      if (!speaker) return NextResponse.json({ error: "Speaker introuvable" }, { status: 404 });

      const [existingCaptions, existingTickers] = await Promise.all([listCaptions(token), listTickers(token)]);

      const captionText = [speaker.name, speaker.title].filter(Boolean).join(", ");
      const captionSecondary = speaker.talkTitle || undefined;
      const tickerText = speaker.talkTitle || speaker.name;

      const skipped: string[] = [];
      let caption = null, ticker = null;

      if (captionText && !existingCaptions.some(c => c.text === captionText)) {
        caption = await createCaption(token, captionText, captionSecondary);
      } else {
        skipped.push("caption");
      }

      if (tickerText && !existingTickers.some(t => t.text === tickerText)) {
        ticker = await createTicker(token, tickerText);
      } else {
        skipped.push("ticker");
      }

      logAction(req, "CREATE", "restream_overlay_speaker", speaker.id, { skipped: skipped.join(",") });
      return NextResponse.json({ caption, ticker, skipped });
    }

    // ── Bulk : tous les speakers visibles ─────────────────────────────────────

    if (action === "bulk_all") {
      const speakers = await prisma.speaker.findMany({
        where: { isVisible: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });

      const [existingCaptions, existingTickers] = await Promise.all([listCaptions(token), listTickers(token)]);

      const captionTexts = new Set(existingCaptions.map(c => c.text));
      const tickerTexts  = new Set(existingTickers.map(t => t.text));

      let captionsCreated = 0, tickersCreated = 0, skipped = 0;

      for (const speaker of speakers) {
        const captionText = [speaker.name, speaker.title].filter(Boolean).join(", ");
        const captionSecondary = speaker.talkTitle || undefined;
        const tickerText = speaker.talkTitle || speaker.name;

        if (captionText && !captionTexts.has(captionText)) {
          await createCaption(token, captionText, captionSecondary);
          captionTexts.add(captionText);
          captionsCreated++;
        } else {
          skipped++;
        }

        if (tickerText && !tickerTexts.has(tickerText)) {
          await createTicker(token, tickerText);
          tickerTexts.add(tickerText);
          tickersCreated++;
        } else {
          skipped++;
        }
      }

      logAction(req, "CREATE", "restream_overlay_bulk", null, { captionsCreated, tickersCreated, skipped, total: speakers.length });
      return NextResponse.json({ captionsCreated, tickersCreated, skipped, total: speakers.length });
    }

    return NextResponse.json({ error: `Action inconnue : ${action}` }, { status: 400 });

  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) });
  }
}
