import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { getSessionEmail } from "@/lib/adminPermissions";

const RETENTION_DAYS = 60;

function getIpFromRequest(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function writeLog(actor: string, ip: string, action: string, resource: string, resourceId?: string | number | null, details?: Record<string, string | number | boolean | null>) {
  prisma.auditLog
    .create({
      data: {
        actor,
        ip,
        action,
        resource,
        resourceId: resourceId != null ? String(resourceId) : null,
        details: details as Prisma.InputJsonValue ?? Prisma.DbNull,
      },
    })
    .catch((e: unknown) => console.error("[AuditLog]", e));
}

/**
 * Fire-and-forget audit log write.
 * Resolves the actor email from the current session automatically.
 * Pass actorOverride when the actor is already known (e.g. login/logout events).
 * Also lazily purges entries older than RETENTION_DAYS (5% chance per call).
 */
export function logAction(
  req: NextRequest,
  action: string,
  resource: string,
  resourceId?: string | number | null,
  details?: Record<string, string | number | boolean | null>,
  actorOverride?: string,
) {
  const ip = getIpFromRequest(req);

  if (actorOverride) {
    writeLog(actorOverride, ip, action, resource, resourceId, details);
  } else {
    // Resolve actor from session — never blocks the response
    getSessionEmail()
      .then(email => writeLog(email ?? "admin", ip, action, resource, resourceId, details))
      .catch(() => writeLog("admin", ip, action, resource, resourceId, details));
  }

  if (Math.random() < 0.05) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    prisma.auditLog
      .deleteMany({ where: { createdAt: { lt: cutoff } } })
      .catch((e: unknown) => console.error("[AuditLog cleanup]", e));
  }
}
