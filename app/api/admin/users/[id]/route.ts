import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHash, randomBytes } from "crypto";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(password + salt).digest("hex");
  return `${salt}:${hash}`;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  const { name, permissions, isActive, password } = await req.json();
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (permissions !== undefined) data.permissions = JSON.stringify(permissions);
  if (isActive !== undefined) data.isActive = isActive;
  if (password) data.passwordHash = hashPassword(password);
  const user = await prisma.adminUser.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, permissions: true, isActive: true, createdAt: true },
  });
  return NextResponse.json(user);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  await prisma.adminUser.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
