import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHash, randomBytes } from "crypto";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(password + salt).digest("hex");
  return `${salt}:${hash}`;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  const { name, permissions, isActive, password, profileId } = await req.json();
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (permissions !== undefined) data.permissions = JSON.stringify(permissions);
  if (isActive !== undefined) data.isActive = isActive;
  if (password) data.passwordHash = hashPassword(password);
  // Reassign profile (numeric admin_profiles FK) and snapshot its permissions.
  if (profileId !== undefined) {
    if (profileId === null || profileId === "") {
      data.profileId = null;
    } else {
      const pid = Number(profileId);
      const dbProfile = Number.isFinite(pid)
        ? await prisma.adminProfile.findUnique({ where: { id: pid } })
        : null;
      if (dbProfile) {
        data.profileId = pid;
        if (permissions === undefined) {
          try { data.permissions = JSON.stringify(JSON.parse(dbProfile.permissions || "{}")); }
          catch { data.permissions = "{}"; }
        }
      }
    }
  }
  const user = await prisma.adminUser.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, permissions: true, isActive: true, profileId: true, createdAt: true },
  });
  logAction(req, "UPDATE", "user", id, { isActive });
  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  await prisma.adminUser.delete({ where: { id } });
  logAction(req, "DELETE", "user", id);
  return NextResponse.json({ success: true });
}
