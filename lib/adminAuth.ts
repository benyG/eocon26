import { createHmac } from "crypto";
import { cookies } from "next/headers";

const SECRET = process.env.ADMIN_SECRET || "change-me-in-production";

export function signToken(password: string): string {
  return createHmac("sha256", SECRET).update(password).digest("hex");
}

export function isValidToken(token: string): boolean {
  const expected = signToken(process.env.ADMIN_PASSWORD || "admin");
  return token === expected;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return false;
  return isValidToken(token);
}
