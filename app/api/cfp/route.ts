import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, org, country, talk_title, format, abstract, bio } = body;

    if (!name || !email || !talk_title || !abstract) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const submission = await prisma.cFPSubmission.create({
      data: { name, email, org, country, talkTitle: talk_title, format, abstract, bio },
    });

    return NextResponse.json({ success: true, id: submission.id }, { status: 201 });
  } catch (err) {
    console.error("[CFP]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const submissions = await prisma.cFPSubmission.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(submissions);
  } catch (err) {
    console.error("[CFP GET]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
