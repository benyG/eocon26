import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHash, randomBytes } from "crypto";
import { Resend } from "resend";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(password + salt).digest("hex");
  return `${salt}:${hash}`;
}

function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const rand = (s: string) => s[Math.floor(Math.random() * s.length)];
  const chars = [rand(upper), rand(upper), rand(digits), rand(digits), rand(lower), rand(lower), rand(lower), rand(lower)];
  // Shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET() {
  if (!(await hasPermission("users", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const users = await prisma.adminUser.findMany({
    select: { id: true, name: true, email: true, permissions: true, isActive: true, profileId: true, createdAt: true, mfaEnabled: true, requiresApproval: true, isCommApprover: true, canPublishCtf: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("users", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name, email, permissions, profileId, requiresApproval, isCommApprover, canPublishCtf } = await req.json();
  if (!name || !email) {
    return NextResponse.json({ error: "Nom et email requis" }, { status: 400 });
  }
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
  }

  // Resolve permissions from DB profile or custom
  let resolvedPermissions = permissions || {};
  if (profileId) {
    const dbProfile = await prisma.adminProfile.findUnique({ where: { id: Number(profileId) } });
    if (dbProfile) {
      try { resolvedPermissions = JSON.parse(dbProfile.permissions); } catch { /* use custom */ }
    }
  }

  const tempPassword = generateTempPassword();

  const user = await prisma.adminUser.create({
    data: {
      name,
      email,
      passwordHash: hashPassword(tempPassword),
      permissions: JSON.stringify(resolvedPermissions),
      profileId: profileId || null,
      requiresApproval: !!requiresApproval,
      isCommApprover: !!isCommApprover,
      canPublishCtf: !!canPublishCtf,
    },
    select: { id: true, name: true, email: true, permissions: true, isActive: true, profileId: true, createdAt: true, requiresApproval: true, isCommApprover: true, canPublishCtf: true },
  });

  // Send welcome email
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "EOCON 2026 <noreply@eyesopensecurity.com>";
  if (apiKey) {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: email,
      subject: "Votre accès à l'espace admin EOCON 2026",
      html: `
        <div style="font-family:monospace;background:#0a0a0f;color:#e0e0e0;padding:32px;max-width:600px">
          <h1 style="color:#00ff9d;margin-bottom:8px">&gt; EOCON 2026 — Accès Admin</h1>
          <p>Bonjour ${esc(name)},</p>
          <p>Un compte administrateur a été créé pour vous sur la plateforme de gestion EOCON 2026.</p>
          <div style="background:#111;border:1px solid #00ff9d33;border-radius:8px;padding:20px;margin:20px 0">
            <p style="margin:0 0 8px"><span style="color:#00ff9d">Email :</span> ${esc(email)}</p>
            <p style="margin:0 0 8px"><span style="color:#00ff9d">Mot de passe temporaire :</span> <strong style="color:#ffffff;font-size:18px">${esc(tempPassword)}</strong></p>
            <p style="margin:0;color:#888;font-size:12px">Vous devrez changer ce mot de passe lors de votre première connexion.</p>
          </div>
          <p><a href="${process.env.NEXT_PUBLIC_URL || "https://eocon.eyesopensecurity.com"}/admin/login" style="color:#00ff9d">Accéder à l'espace admin →</a></p>
          <hr style="border-color:#222;margin:24px 0"/>
          <p style="color:#555;font-size:12px">EOCON 2026 · Services ExamBoot Inc.</p>
        </div>`,
    }).catch(e => console.error("[Admin user email]", e));
  }

  return NextResponse.json({ ...user, tempPassword }, { status: 201 });
}
