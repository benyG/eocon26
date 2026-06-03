import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHash, randomBytes } from "crypto";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(password + salt).digest("hex");
  return `${salt}:${hash}`;
}

export async function GET() {
  const users = await prisma.adminUser.findMany({
    select: { id: true, name: true, email: true, permissions: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const { name, email, password, permissions } = await req.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }
  const user = await prisma.adminUser.create({
    data: { name, email, passwordHash: hashPassword(password), permissions: JSON.stringify(permissions || {}) },
    select: { id: true, name: true, email: true, permissions: true, isActive: true, createdAt: true },
  });
  return NextResponse.json(user, { status: 201 });
}
