import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

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
 * Also lazily purges entries older than RETENTION_DAYS (5% chance per call).
 */
export function logAction(
  req: NextRequest,
  action: string,
  resource: string,
  resourceId?: string | number | null,
  details?: Record<string, string | number | boolean | null>,
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
        details: details as Prisma.InputJsonValue ?? Prisma.DbNull,
      },
    })
    .catch((e: unknown) => console.error("[AuditLog]", e));

  if (Math.random() < 0.05) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    prisma.auditLog
      .deleteMany({ where: { createdAt: { lt: cutoff } } })
      .catch((e: unknown) => console.error("[AuditLog cleanup]", e));
  }
}

