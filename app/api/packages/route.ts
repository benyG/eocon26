export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const packages = await prisma.sponsorPackage.findMany({
    where: { isVisible: true },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(packages);
}
