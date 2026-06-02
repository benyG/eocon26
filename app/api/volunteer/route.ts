import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, city, role, experience, motivation } = body;

    if (!name || !email || !motivation) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const application = await prisma.volunteerApplication.create({
      data: { name, email, phone, city, role, experience, motivation },
    });

    return NextResponse.json({ success: true, id: application.id }, { status: 201 });
  } catch (err) {
    console.error("[Volunteer]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const applications = await prisma.volunteerApplication.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(applications);
  } catch (err) {
    console.error("[Volunteer GET]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
