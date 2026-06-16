import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("cfp", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await prisma.workshop.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }));
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("cfp", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await req.json();
  const workshop = await prisma.workshop.create({ data });

  // Create linked ConferenceSession so the workshop appears in the programme backlog
  await prisma.conferenceSession.create({
    data: {
      title: workshop.title,
      type: "workshop",
      speakerName: workshop.instructor || undefined,
      workshopId: workshop.id,
      description: workshop.description,
      time: "TBD",
      isVisible: false, // will be made visible when scheduled in programme
      sortOrder: 999,
    },
  });

  return NextResponse.json(workshop, { status: 201 });
}
