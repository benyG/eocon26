import { NextResponse } from "next/server";
import { getOnlineSession } from "@/lib/onlineAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getOnlineSession();
  if (!session) return NextResponse.json({ ok: false });
  return NextResponse.json({
    ok: true,
    session: {
      fname: session.fname,
      lname: session.lname,
      ticketType: session.ticketType,
    },
  });
}
