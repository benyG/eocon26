import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendRegistrationTicket } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fname, lname, email, org, country, ticketType } = body;

    if (!fname || !lname || !email || !ticketType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const registration = await prisma.registration.create({
      data: { fname, lname, email, org, country, ticketType },
    });

    sendRegistrationTicket(email, fname, lname, ticketType, registration.id).catch(e =>
      console.error("[Register email]", e),
    );

    return NextResponse.json({ success: true, id: registration.id }, { status: 201 });
  } catch (err) {
    console.error("[Register]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const registrations = await prisma.registration.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(registrations);
  } catch (err) {
    console.error("[Register GET]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
