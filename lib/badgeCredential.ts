/// <reference types="node" />
import { createPrivateKey, createPublicKey, sign, verify } from "crypto";
import { generateBadgeSvg, svgToDataUrl, BadgeType } from "./badgeSvg";

const BADGE_ACHIEVEMENTS: Record<BadgeType, { name: string; description: string; criteria: string }> = {
  participant: {
    name: "EOCON 2026 — Conference Participant",
    description: "Awarded to attendees who participated in the 7th edition of EyesOpen Security Conference (EOCON 2026).",
    criteria: "The recipient attended EOCON 2026, the 7th edition of the EyesOpen Security Conference, held in Douala, Cameroon.",
  },
  speaker: {
    name: "EOCON 2026 — Conference Speaker",
    description: "Awarded to speakers who delivered a conference talk at EOCON 2026.",
    criteria: "The recipient delivered a talk or presentation at EOCON 2026, demonstrating expertise shared with the cybersecurity community.",
  },
  volunteer: {
    name: "EOCON 2026 — Conference Volunteer",
    description: "Awarded to volunteers who contributed to the organization of EOCON 2026.",
    criteria: "The recipient volunteered their time and skills to help organize and run EOCON 2026.",
  },
  ctf_competitor: {
    name: "EOCTF 2026 — CTF Competitor",
    description: "Awarded to participants who competed in the EOCTF 2026 Capture The Flag competition.",
    criteria: "The recipient participated in the EOCTF 2026 48-hour Capture The Flag competition.",
  },
  ctf_winner: {
    name: "EOCTF 2026 — CTF Winner",
    description: "Awarded to top-ranking competitors in the EOCTF 2026 Capture The Flag competition.",
    criteria: "The recipient achieved a top ranking in the EOCTF 2026 48-hour Capture The Flag competition.",
  },
  organizer: {
    name: "EOCON 2026 — Organizing Team",
    description: "Awarded to members of the EyesOpen organizing team for EOCON 2026.",
    criteria: "The recipient was a core member of the EOCON 2026 organizing team.",
  },
};

function getPrivateKeyPem(): string {
  const key = process.env.BADGE_PRIVATE_KEY;
  if (!key) throw new Error("BADGE_PRIVATE_KEY env var not set");
  if (key.startsWith("-----")) return key;
  return Buffer.from(key, "base64").toString("utf-8");
}

function getPublicKeyPem(): string {
  const key = process.env.BADGE_PUBLIC_KEY;
  if (!key) throw new Error("BADGE_PUBLIC_KEY env var not set");
  if (key.startsWith("-----")) return key;
  return Buffer.from(key, "base64").toString("utf-8");
}

export function generateBadgeCredential(
  uuid: string,
  badgeType: BadgeType,
  recipientName: string,
  recipientEmail: string,
  subtype?: string | null,
  extraData?: Record<string, string>,
): object {
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://eyesopensecurity.com";
  const achievement = BADGE_ACHIEVEMENTS[badgeType];
  const svgDataUrl = svgToDataUrl(generateBadgeSvg(badgeType, recipientName, "2026", subtype));
  const now = new Date().toISOString();

  const credential = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    ],
    id: `${baseUrl}/verify/${uuid}`,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    name: achievement.name,
    issuer: {
      id: `${baseUrl}`,
      type: "Profile",
      name: "EyesOpen Association",
      url: "https://eyesopensecurity.com",
      description: "EyesOpen Association — Cybersecurity community in Cameroon and Africa",
      image: { id: `${baseUrl}/logo.png`, type: "Image" },
    },
    issuanceDate: now,
    expirationDate: null,
    credentialSubject: {
      id: `mailto:${recipientEmail}`,
      type: ["AchievementSubject"],
      name: recipientName,
      ...(subtype ? { ticketLevel: subtype } : {}),
      ...(extraData ?? {}),
      achievement: {
        id: `${baseUrl}/badges/${badgeType}`,
        type: ["Achievement"],
        name: achievement.name,
        description: achievement.description,
        image: { id: svgDataUrl, type: "Image" },
        criteria: { narrative: achievement.criteria },
        achievementType: "Badge",
        tags: ["EOCON2026", "cybersecurity", "africa", badgeType],
      },
    },
  };

  return credential;
}

export function signCredential(credential: object): string {
  const privateKeyPem = getPrivateKeyPem();
  const privateKey = createPrivateKey({ key: privateKeyPem, format: "pem" });
  const message = JSON.stringify(credential, null, 0);
  const signature = sign(null, Buffer.from(message, "utf-8"), privateKey);
  const proofValue = signature.toString("base64");
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://eyesopensecurity.com";

  return JSON.stringify({
    ...credential,
    proof: {
      type: "DataIntegrityProof",
      cryptosuite: "eddsa-rdfc-2022",
      created: new Date().toISOString(),
      verificationMethod: `${baseUrl}/api/did#key-1`,
      proofPurpose: "assertionMethod",
      proofValue,
    },
  });
}

export function verifyCredential(credentialJson: string): boolean {
  try {
    const publicKeyPem = getPublicKeyPem();
    const publicKey = createPublicKey({ key: publicKeyPem, format: "pem" });
    const cred = JSON.parse(credentialJson);
    const { proof, ...credWithoutProof } = cred;
    if (!proof?.proofValue) return false;
    const message = JSON.stringify(credWithoutProof, null, 0);
    const signature = Buffer.from(proof.proofValue, "base64");
    return verify(null, Buffer.from(message, "utf-8"), publicKey, signature);
  } catch {
    return false;
  }
}
