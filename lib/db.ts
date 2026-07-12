import { PrismaClient, Prisma } from "@prisma/client";

// Ensure a healthy connection pool. Prisma's default limit (num_cpus*2+1) can be as low
// as 3 on a 1-vCPU container, which the campaign/email routes exhaust. Raise it unless the
// DATABASE_URL already configures it explicitly.
function dbUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || /[?&]connection_limit=/.test(url)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}connection_limit=10&pool_timeout=20`;
}

// Only override the datasource url when we actually have one. Passing
// `{ url: undefined }` makes the PrismaClient constructor throw (e.g. during
// `next build` page-data collection when DATABASE_URL isn't in the env).
const _dbUrl = dbUrl();

function newBaseClient() {
  return new PrismaClient({
    ...(_dbUrl ? { datasources: { db: { url: _dbUrl } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["error"] : [],
  });
}

// ── Automatic audit of admin mutations ───────────────────────────────────────
// A Prisma client extension records every write performed by a logged-in admin
// (who, what, when, from where), so the audit log is comprehensive without
// having to instrument all ~180 API routes by hand.
const AUDIT_OP: Record<string, string> = {
  create: "CREATE", createMany: "CREATE", upsert: "UPSERT",
  update: "UPDATE", updateMany: "UPDATE",
  delete: "DELETE", deleteMany: "DELETE",
};

// Models NOT auto-logged: audit/session/email plumbing (noise + recursion) and
// the models already covered by explicit logAction() calls (avoids duplicates).
const AUDIT_SKIP = new Set<string>([
  "AuditLog", "AdminSession", "EmailLog",
  "SteeringTask", "SteeringMeeting", "VolunteerApplication", "Registration",
  "BadgeCredential", "AdminUser", "Sponsor", "SpeakerProfile", "Speaker",
  "ConferenceSession", "CFPSubmission", "NewsletterSubscriber",
]);

// Resolve the acting admin (and their IP) from the current request. Returns null
// for public/cron/system writes, which are intentionally not audited.
async function resolveActor(base: PrismaClient): Promise<{ actor: string; ip: string } | null> {
  try {
    const nh = await import("next/headers");
    const cookieStore = await nh.cookies();
    const hdrs = await nh.headers();
    const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "unknown";

    const userCookie = cookieStore.get("admin_user_token")?.value;
    if (userCookie) {
      const { verifyUserSession } = await import("@/lib/adminAuth");
      const parsed = verifyUserSession(userCookie);
      if (parsed) {
        const session = await base.adminSession.findFirst({
          where: { userId: parsed.userId, token: parsed.sessionToken, expiresAt: { gt: new Date() } },
          select: { user: { select: { email: true, isActive: true } } },
        });
        if (session?.user?.isActive) return { actor: session.user.email, ip };
      }
    }
    const legacy = cookieStore.get("admin_token")?.value;
    if (legacy) {
      const { isValidToken } = await import("@/lib/adminAuth");
      if (isValidToken(legacy)) return { actor: "admin (mot de passe partagé)", ip };
    }
  } catch {
    /* not in a request scope (script/build) → skip */
  }
  return null;
}

function extractId(args: unknown, result: unknown): string | null {
  if (result && typeof result === "object" && "id" in result && (result as { id?: unknown }).id != null) {
    return String((result as { id: unknown }).id);
  }
  const where = (args as { where?: { id?: unknown } } | undefined)?.where;
  if (where && where.id != null) return String(where.id);
  return null;
}

async function recordAudit(base: PrismaClient, model: string, operation: string, args: unknown, result: unknown) {
  const who = await resolveActor(base);
  if (!who) return; // not an admin-initiated action
  const count = result && typeof result === "object" && "count" in result ? (result as { count: number }).count : undefined;
  await base.auditLog.create({
    data: {
      actor: who.actor,
      ip: who.ip,
      action: AUDIT_OP[operation],
      resource: model,
      resourceId: extractId(args, result),
      details: { op: operation, ...(count !== undefined ? { count } : {}) } as Prisma.InputJsonValue,
    },
  });
}

function extendWithAudit(base: PrismaClient) {
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const result = await query(args);
          // Audit runs AFTER the real query and is fully isolated: it can never
          // affect the operation's result or throw into the caller.
          if (model && AUDIT_OP[operation] && !AUDIT_SKIP.has(model)) {
            recordAudit(base, model, operation, args, result).catch(() => {});
          }
          return result;
        },
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prismaBase?: PrismaClient;
  prisma?: PrismaClient;
};

const base = globalForPrisma.prismaBase ?? newBaseClient();
// The audit extension is applied at runtime, but we expose the client typed as
// the plain PrismaClient so every existing call site keeps its original (looser)
// input types — $extends otherwise tightens them to Exact<> and breaks routes
// that pass dynamically-built `data` objects.
export const prisma: PrismaClient = globalForPrisma.prisma ?? (extendWithAudit(base) as unknown as PrismaClient);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaBase = base;
  globalForPrisma.prisma = prisma;
}
