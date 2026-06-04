import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { generateQrPayload } from "@/lib/qr";
import QRCode from "qrcode";
import { formatTicketRef } from "@/lib/ticketRef";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const registrationId = req.nextUrl.searchParams.get("id");

  if (registrationId) {
    const id = parseInt(registrationId);
    const reg = await prisma.registration.findUnique({ where: { id } });
    if (!reg) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const payload = generateQrPayload(reg.id);
    const qrDataUrl = await QRCode.toDataURL(payload, { width: 300, margin: 2, color: { dark: "#000000", light: "#ffffff" } });
    return NextResponse.json({
      id: reg.id,
      name: `${reg.fname} ${reg.lname}`,
      ticketRef: formatTicketRef(reg.ticketRef || String(reg.id)),
      ticketType: reg.ticketType,
      status: reg.status,
      qrDataUrl,
      payload,
    });
  }

  const regs = await prisma.registration.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, fname: true, lname: true, ticketType: true, status: true, ticketRef: true },
  });
  return NextResponse.json(regs);
}
