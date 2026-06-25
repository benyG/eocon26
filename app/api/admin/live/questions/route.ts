import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("live", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const questions = await prisma.sessionQuestion.findMany({
    where: { hidden: false },
    orderBy: { askedAt: "desc" },
    select: { id: true, body: true, displayName: true, approved: true, answered: true, upvotes: true, adminNote: true, askedAt: true },
  });

  return NextResponse.json(questions);
}
