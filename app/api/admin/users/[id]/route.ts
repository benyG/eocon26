import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHash, randomBytes } from "crypto";
import { logAction } from "@/lib/auditLog";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(password + salt).digest("hex");
  return `${salt}:${hash}`;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("users", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = parseInt(params.id);
  const { name, permissions, isActive, password, requiresApproval, isCommApprover, canPublishCtf } = await req.json();
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (permissions !== undefined) data.permissions = JSON.stringify(permissions);
  if (isActive !== undefined) data.isActive = isActive;
  if (password) data.passwordHash = hashPassword(password);
  if (requiresApproval !== undefined) data.requiresApproval = !!requiresApproval;
  if (isCommApprover !== undefined) data.isCommApprover = !!isCommApprover;
  if (canPublishCtf !== undefined) data.canPublishCtf = !!canPublishCtf;
  const user = await prisma.adminUser.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, permissions: true, isActive: true, createdAt: true, requiresApproval: true, isCommApprover: true, canPublishCtf: true },
  });
  logAction(req, "UPDATE", "user", id, { isActive });
  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("users", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = parseInt(params.id);
  await prisma.adminUser.delete({ where: { id } });
  logAction(req, "DELETE", "user", id);
  return NextResponse.json({ success: true });
}
