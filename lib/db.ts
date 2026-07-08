import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Ensure a healthy connection pool. Prisma's default limit (num_cpus*2+1) can be as low
// as 3 on a 1-vCPU container, which the campaign/email routes exhaust. Raise it unless the
// DATABASE_URL already configures it explicitly.
function dbUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || /[?&]connection_limit=/.test(url)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}connection_limit=10&pool_timeout=20`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: dbUrl() } },
    log: process.env.NODE_ENV === "development" ? ["error"] : [],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
