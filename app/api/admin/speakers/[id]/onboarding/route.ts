import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const speakerId = parseInt(params.id);
  const onboarding = await prisma.speakerOnboarding.findUnique({ where: { speakerId } });
  return NextResponse.json(onboarding || { speakerId });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const speakerId = parseInt(params.id);
  const data = await req.json();
  const onboarding = await prisma.speakerOnboarding.upsert({
    where: { speakerId },
    create: { speakerId, ...data },
    update: data,
  });
  return NextResponse.json(onboarding);
}
