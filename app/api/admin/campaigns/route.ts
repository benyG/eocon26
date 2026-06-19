import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("campaigns", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await prisma.campaign.findMany({ orderBy: { createdAt: "desc" } }));
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("campaigns", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name, subject, htmlBody, segment } = await req.json();
  if (!name?.trim() || !subject?.trim()) return NextResponse.json({ error: "name and subject are required" }, { status: 400 });
  const campaign = await prisma.campaign.create({
    data: {
      name: name.trim(),
      subject: subject.trim(),
      htmlBody: htmlBody || "",
      segment: typeof segment === "string" ? segment : JSON.stringify(segment ?? { audience: "registrations" }),
      status: "draft",
    },
  });
  return NextResponse.json(campaign, { status: 201 });
}
