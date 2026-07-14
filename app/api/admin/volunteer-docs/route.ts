import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";
import { VOLUNTEER_DOCS, ROLE_DOC_MAP, DEFAULT_DOC_KEYS, renderDocsEmail } from "@/lib/volunteerDocs";
import { canonicalVolunteerRole } from "@/lib/volunteerRoles";
import { Resend } from "resend";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET → the catalog of onboarding documents (metadata only, no content) and the
// role → suggested-docs mapping, so the kanban "Documents" tab can render.
export async function GET() {
  if (!(await hasPermission("volunteers", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({
    docs: VOLUNTEER_DOCS.map(d => ({ key: d.key, title: d.title, emoji: d.emoji, kind: d.kind })),
    roleMap: ROLE_DOC_MAP,
    defaults: DEFAULT_DOC_KEYS,
  });
}

// POST { volunteerId, docKeys[] } → email the selected documents to the
// volunteer (single recap email containing every selected document), then
// record what was sent in VolunteerApplication.docsSent.
export async function POST(req: NextRequest) {
  if (!(await hasPermission("volunteers", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { volunteerId, docKeys } = await req.json() as { volunteerId: number; docKeys: string[] };

  const keys = (docKeys || []).filter(k => VOLUNTEER_DOCS.some(d => d.key === k));
  if (!keys.length) return NextResponse.json({ error: "Aucun document sélectionné" }, { status: 400 });

  const vol = await prisma.volunteerApplication.findUnique({ where: { id: volunteerId } });
  if (!vol) return NextResponse.json({ error: "Bénévole introuvable" }, { status: 404 });
  if (!vol.email) return NextResponse.json({ error: "Ce bénévole n'a pas d'email" }, { status: 400 });

  const docs = VOLUNTEER_DOCS.filter(d => keys.includes(d.key));
  const { subject, html } = renderDocsEmail(vol.name, canonicalVolunteerRole(vol.assignedRole || vol.role), docs);

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM || "EOCON 2026 <noreply@eyesopensecurity.com>";
  try {
    await resend.emails.send({ from, to: vol.email, subject, html });
  } catch (e) {
    console.error("[volunteer docs email]", e);
    return NextResponse.json({ error: "Échec de l'envoi de l'email" }, { status: 500 });
  }

  // Record sent docs (merge with previous sends)
  let sent: Record<string, string> = {};
  try { sent = JSON.parse(vol.docsSent || "{}"); } catch { sent = {}; }
  const now = new Date().toISOString();
  for (const k of keys) sent[k] = now;
  const updated = await prisma.volunteerApplication.update({
    where: { id: volunteerId },
    data: { docsSent: JSON.stringify(sent) },
  });

  logAction(req, "UPDATE", "volunteer", volunteerId, { docsSent: keys.join(",") });
  return NextResponse.json(updated);
}
