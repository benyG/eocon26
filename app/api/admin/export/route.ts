import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map(h => {
      const v = row[h];
      if (v === null || v === undefined) return "";
      const s = String(v).replace(/"/g, '""');
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
    }).join(","));
  }
  return lines.join("\n");
}

export async function GET(req: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "registrations";

  let csv = "";
  let filename = "";

  if (type === "registrations") {
    const rows = await prisma.registration.findMany({ orderBy: { createdAt: "asc" } });
    csv = toCSV(rows as unknown as Record<string, unknown>[]);
    filename = "inscriptions.csv";
  } else if (type === "cfp") {
    const rows = await prisma.cFPSubmission.findMany({ orderBy: { createdAt: "asc" } });
    csv = toCSV(rows as unknown as Record<string, unknown>[]);
    filename = "cfp.csv";
  } else if (type === "volunteers") {
    const rows = await prisma.volunteerApplication.findMany({ orderBy: { createdAt: "asc" } });
    csv = toCSV(rows as unknown as Record<string, unknown>[]);
    filename = "benevoles.csv";
  } else if (type === "newsletter") {
    const rows = await prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: "asc" } });
    csv = toCSV(rows as unknown as Record<string, unknown>[]);
    filename = "newsletter.csv";
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
