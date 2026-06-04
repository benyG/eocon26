import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  const settings = await prisma.eventSetting.findMany();
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });
  return NextResponse.json(map);
}
