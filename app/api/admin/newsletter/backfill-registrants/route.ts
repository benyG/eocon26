import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Add every existing registrant (incl. pre-registrations) to the newsletter.
// Purely ADDITIVE: uses skipDuplicates so existing subscribers are never
// overwritten and re-running only inserts the ones still missing.
export async function POST(req: NextRequest) {
  if (!(await hasPermission("newsletter", "write"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const regs = await prisma.registration.findMany({
    select: { email: true, fname: true, lname: true, org: true, linkedin: true },
  });

  const rows = regs
    .filter((r) => r.email)
    .map((r) => ({
      email: r.email,
      firstName: r.fname?.slice(0, 80) || undefined,
      lastName: r.lname?.slice(0, 80) || undefined,
      company: r.org?.slice(0, 200) || undefined,
      linkedin: r.linkedin?.slice(0, 191) || undefined,
      source: "registration",
    }));

  let added = 0;
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const res = await prisma.newsletterSubscriber.createMany({
      data: rows.slice(i, i + CHUNK),
      skipDuplicates: true,
    });
    added += res.count;
  }

  logAction(req, "CREATE", "newsletter", null, { backfillRegistrants: added, scanned: rows.length });
  return NextResponse.json({ added, scanned: rows.length, alreadyPresent: rows.length - added });
}
