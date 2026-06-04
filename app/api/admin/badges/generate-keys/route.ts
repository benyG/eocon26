import { NextResponse } from "next/server";
import { generateKeyPairSync } from "crypto";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { privateKey, publicKey } = generateKeyPairSync("ed25519", {
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });

  return NextResponse.json({
    privateKeyBase64: Buffer.from(privateKey).toString("base64"),
    publicKeyBase64: Buffer.from(publicKey).toString("base64"),
    instructions: "Add these to your .env file as BADGE_PRIVATE_KEY and BADGE_PUBLIC_KEY. Keep BADGE_PRIVATE_KEY secret.",
  });
}
