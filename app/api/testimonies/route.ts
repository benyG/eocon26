export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const lang = new URL(req.url).searchParams.get("lang") ?? "en";
  const rows = await prisma.testimony.findMany({
    where: { isVisible: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const items = rows.map(r => ({
    quote: lang === "fr" && r.quoteFr ? r.quoteFr : r.quoteEn,
    author: r.author,
  }));
  return NextResponse.json(items);
}
