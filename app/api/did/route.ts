import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://eocon.eyesopensecurity.com";
  const publicKeyB64 = process.env.BADGE_PUBLIC_KEY || "";
  // Decode PEM to get the raw key bytes for the DID document
  const pem = publicKeyB64.startsWith("-----") ? publicKeyB64 : Buffer.from(publicKeyB64, "base64").toString("utf-8");
  // Extract base64 content from PEM
  const pemBody = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");

  return NextResponse.json({
    "@context": ["https://www.w3.org/ns/did/v1", "https://w3id.org/security/suites/ed25519-2020/v1"],
    "id": baseUrl,
    "verificationMethod": [{
      "id": `${baseUrl}/api/did#key-1`,
      "type": "Ed25519VerificationKey2020",
      "controller": baseUrl,
      "publicKeyMultibase": `z${pemBody}`,
    }],
    "assertionMethod": [`${baseUrl}/api/did#key-1`],
  });
}
