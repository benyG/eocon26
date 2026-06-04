import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

const RETENTION_DAYS = 60;

function getIpFromRequest(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Fire-and-forget audit log write.
 * Also lazily purges entries older than RETENTION_DAYS (1% chance per call to avoid overhead).
 */
export function logAction(
  req: NextRequest,
  action: string,
  resource: string,
  resourceId?: string | number | null,
  details?: Record<string, unknown>,
) {
  const ip = getIpFromRequest(req);

  // Async, non-blocking — never await this in a hot path
  prisma.auditLog
    .create({
      data: {
        ip,
        action,
        resource,
        resourceId: resourceId != null ? String(resourceId) : null,
        details: details ?? undefined,
      },
    })
    .catch(e => console.error("[AuditLog]", e));

  // 5% chance of running cleanup to keep the table lean
  if (Math.random() < 0.05) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    prisma.auditLog
      .deleteMany({ where: { createdAt: { lt: cutoff } } })
      .catch(e => console.error("[AuditLog cleanup]", e));
  }
}
