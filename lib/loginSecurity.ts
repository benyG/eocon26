import { Resend } from "resend";
import { prisma } from "@/lib/db";

export const MAX_FAILS = 3;
export const LOCK_MS = 10 * 60 * 1000; // 10 minutes
const ALERT_TO = "eyesopsec@gmail.com";

// ── Shared-password (ADMIN_SECRET) login — IP based, in-memory ───────────────
interface IpEntry { count: number; windowEnd: number; lockedUntil: number }
const ipFails = new Map<string, IpEntry>();

export function isIpLocked(ip: string): boolean {
  const e = ipFails.get(ip);
  return !!e && e.lockedUntil > Date.now();
}

// Records a failed attempt; returns true if the IP is now locked.
export function registerIpFailure(ip: string): boolean {
  const now = Date.now();
  let e = ipFails.get(ip);
  if (!e || now > e.windowEnd) {
    e = { count: 0, windowEnd: now + LOCK_MS, lockedUntil: 0 };
    ipFails.set(ip, e);
  }
  e.count++;
  if (e.count >= MAX_FAILS) e.lockedUntil = now + LOCK_MS;
  // bound memory
  if (ipFails.size > 10000) for (const [k, v] of ipFails) if (now > v.windowEnd && v.lockedUntil < now) ipFails.delete(k);
  return e.lockedUntil > now;
}

export function clearIpFailures(ip: string): void {
  ipFails.delete(ip);
}

// ── Per-user (DB) login lockout ──────────────────────────────────────────────
export function isUserLocked(user: { lockedUntil?: Date | null }): boolean {
  return !!user.lockedUntil && user.lockedUntil.getTime() > Date.now();
}

// Increments the user's failure counter; locks the account at MAX_FAILS.
// Returns true if the account is now locked.
export async function registerUserFailure(userId: number): Promise<boolean> {
  const user = await prisma.adminUser.findUnique({ where: { id: userId }, select: { failedLoginCount: true } });
  const next = (user?.failedLoginCount ?? 0) + 1;
  if (next >= MAX_FAILS) {
    await prisma.adminUser.update({
      where: { id: userId },
      data: { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCK_MS) },
    });
    return true;
  }
  await prisma.adminUser.update({ where: { id: userId }, data: { failedLoginCount: next } });
  return false;
}

export async function clearUserFailures(userId: number): Promise<void> {
  await prisma.adminUser.update({
    where: { id: userId },
    data: { failedLoginCount: 0, lockedUntil: null },
  }).catch(() => {});
}

// ── Security alert email ─────────────────────────────────────────────────────
export async function notifyFailedAdminLogin(ip: string, detail = ""): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const from = process.env.EMAIL_FROM || "EOCON 2026 <noreply@eyesopensecurity.com>";
  const when = new Date().toISOString();
  try {
    await new Resend(apiKey).emails.send({
      from,
      to: ALERT_TO,
      subject: "⚠️ Tentative de connexion admin échouée — EOCON",
      html: `<div style="font-family:monospace;background:#0a0a0f;color:#e0e0e0;padding:24px">
        <h2 style="color:#ff0066;margin:0 0 12px">⚠️ Échec de connexion admin (mot de passe partagé)</h2>
        <p>Une tentative de connexion avec le mot de passe administrateur a échoué.</p>
        <p><strong>IP :</strong> ${ip}<br/><strong>Heure (UTC) :</strong> ${when}${detail ? `<br/><strong>Détail :</strong> ${detail}` : ""}</p>
        <p style="color:#888;font-size:12px">EOCON · alerte de sécurité automatique</p>
      </div>`,
    });
  } catch (e) {
    console.error("[notifyFailedAdminLogin]", e);
  }
}
