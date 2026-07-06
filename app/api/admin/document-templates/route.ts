import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { DEFAULT_TEMPLATES } from "@/lib/documentTemplates";

export const dynamic = "force-dynamic";

// List the editable templates, merging DB overrides with the code defaults.
export async function GET() {
  if (!(await hasPermission("documents", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await prisma.documentTemplate.findMany();
  const byKey = new Map(rows.map(r => [r.docKey, r]));
  const merged = Object.entries(DEFAULT_TEMPLATES).map(([docKey, def]) => {
    const r = byKey.get(docKey);
    return {
      docKey,
      nameFr: r?.nameFr ?? def.nameFr,
      nameEn: r?.nameEn ?? def.nameEn,
      bodyFr: r?.bodyFr ?? def.bodyFr,
      bodyEn: r?.bodyEn ?? def.bodyEn,
      isCustom: !!r,
    };
  });
  return NextResponse.json(merged);
}

// Upsert a template override (customize).
export async function PUT(req: NextRequest) {
  if (!(await hasPermission("documents", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { docKey, nameFr, nameEn, bodyFr, bodyEn } = await req.json();
  const def = DEFAULT_TEMPLATES[docKey];
  if (!def) return NextResponse.json({ error: "Unknown template" }, { status: 400 });
  const row = await prisma.documentTemplate.upsert({
    where: { docKey },
    update: { nameFr: nameFr ?? def.nameFr, nameEn: nameEn ?? def.nameEn, bodyFr: bodyFr ?? def.bodyFr, bodyEn: bodyEn ?? def.bodyEn },
    create: { docKey, nameFr: nameFr ?? def.nameFr, nameEn: nameEn ?? def.nameEn, bodyFr: bodyFr ?? def.bodyFr, bodyEn: bodyEn ?? def.bodyEn },
  });
  return NextResponse.json(row);
}

// Reset a template to its code default.
export async function DELETE(req: NextRequest) {
  if (!(await hasPermission("documents", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const docKey = req.nextUrl.searchParams.get("docKey");
  if (!docKey) return NextResponse.json({ error: "docKey required" }, { status: 400 });
  await prisma.documentTemplate.deleteMany({ where: { docKey } });
  return NextResponse.json({ success: true });
}
