import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { verifyCredential } from "@/lib/badgeCredential";
import { generateBadgeSvg, BadgeType } from "@/lib/badgeSvg";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { uuid: string } }): Promise<Metadata> {
  const badge = await prisma.badgeCredential.findUnique({ where: { uuid: params.uuid } });
  if (!badge) return { title: "Badge — EOCON 2026" };
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://eocon.eyesopensecurity.com";
  const cred = JSON.parse(badge.credentialJson);
  const imageUrl = `${baseUrl}/api/verify/${badge.uuid}/image`;
  const pageUrl = `${baseUrl}/verify/${badge.uuid}`;
  const title = `${cred.name || "EOCON 2026 Badge"} — ${badge.recipientName}`;
  const description = `Verified Open Badge issued by EyesOpen Association for EOCON 2026`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: "website",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function VerifyPage({ params }: { params: { uuid: string } }) {
  const badge = await prisma.badgeCredential.findUnique({ where: { uuid: params.uuid } });

  if (!badge) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", color: "#e0e0e0" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#ff0066", fontSize: "14px", letterSpacing: "2px" }}>BADGE NOT FOUND</p>
          <p style={{ color: "#555", fontSize: "12px" }}>This badge ID does not exist.</p>
        </div>
      </div>
    );
  }

  const isRevoked = !!badge.revokedAt;
  const isValid = !isRevoked && verifyCredential(badge.credentialJson);
  const cred = JSON.parse(badge.credentialJson);
  const badgeColors: Record<string, string> = {
    participant: "#00ff9d", speaker: "#cc0000", volunteer: "#ff6600",
    ctf_competitor: "#00ccff", ctf_winner: "#ffd700", organizer: "#cc00ff",
  };
  const color = badgeColors[badge.badgeType] || "#00ff9d";
  const svgString = generateBadgeSvg(badge.badgeType as BadgeType, badge.recipientName, "2026", badge.subtype);
  const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svgString).toString("base64")}`;
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://eocon.eyesopensecurity.com";

  const linkedinAddUrl = new URL("https://www.linkedin.com/profile/add");
  linkedinAddUrl.searchParams.set("startTask", "CERTIFICATION_NAME");
  linkedinAddUrl.searchParams.set("name", cred.name || "EOCON 2026 Badge");
  linkedinAddUrl.searchParams.set("issueYear", "2026");
  linkedinAddUrl.searchParams.set("issueMonth", "11");
  linkedinAddUrl.searchParams.set("certUrl", `${baseUrl}/verify/${badge.uuid}`);
  linkedinAddUrl.searchParams.set("certId", badge.uuid);

  const linkedinShareUrl = new URL("https://www.linkedin.com/shareArticle");
  linkedinShareUrl.searchParams.set("mini", "true");
  linkedinShareUrl.searchParams.set("url", `${baseUrl}/verify/${badge.uuid}`);
  linkedinShareUrl.searchParams.set("title", cred.name || "EOCON 2026 Badge");

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "'Share Tech Mono', monospace", color: "#e0e0e0", padding: "40px 20px" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <p style={{ fontSize: "11px", letterSpacing: "4px", color, textTransform: "uppercase", margin: "0 0 8px" }}>&gt; BADGE VERIFICATION</p>
          <h1 style={{ fontSize: "24px", color: "#ffffff", margin: "0", fontFamily: "Georgia, serif" }}>EOCON 2026</h1>
        </div>

        {/* Verification status */}
        <div style={{
          background: isRevoked ? "#1a0000" : isValid ? "#001a0d" : "#1a1a00",
          border: `1px solid ${isRevoked ? "#ff0066" : isValid ? "#00ff9d" : "#ffaa00"}`,
          borderRadius: "8px", padding: "16px", marginBottom: "32px", textAlign: "center"
        }}>
          <p style={{ fontSize: "20px", margin: "0 0 4px", color: isRevoked ? "#ff0066" : isValid ? "#00ff9d" : "#ffaa00" }}>
            {isRevoked ? "✗ REVOKED" : isValid ? "✓ VERIFIED" : "⚠ UNVERIFIABLE"}
          </p>
          <p style={{ fontSize: "11px", color: "#666", margin: 0 }}>
            {isRevoked ? "This badge has been revoked by the issuer."
              : isValid ? "Cryptographic signature is valid. This badge is authentic."
              : "Signature could not be verified."}
          </p>
        </div>

        {/* Badge + info */}
        <div style={{ display: "flex", gap: "32px", alignItems: "flex-start", marginBottom: "32px", flexWrap: "wrap" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={svgDataUrl} width="200" height="231" alt="Badge" style={{ borderRadius: "4px" }} />
          <div style={{ flex: 1, minWidth: "200px" }}>
            <p style={{ fontSize: "11px", color: "#555", margin: "0 0 4px", letterSpacing: "2px" }}>RECIPIENT</p>
            <p style={{ fontSize: "18px", color: "#ffffff", margin: "0 0 16px", fontFamily: "Georgia, serif" }}>{badge.recipientName}</p>

            <p style={{ fontSize: "11px", color: "#555", margin: "0 0 4px", letterSpacing: "2px" }}>BADGE</p>
            <p style={{ fontSize: "14px", color, margin: "0 0 16px" }}>{cred.name}</p>

            {badge.subtype && (
              <>
                <p style={{ fontSize: "11px", color: "#555", margin: "0 0 4px", letterSpacing: "2px" }}>LEVEL</p>
                <p style={{ fontSize: "13px", color: "#aaa", margin: "0 0 16px", textTransform: "uppercase" }}>{badge.subtype}</p>
              </>
            )}

            <p style={{ fontSize: "11px", color: "#555", margin: "0 0 4px", letterSpacing: "2px" }}>ISSUED</p>
            <p style={{ fontSize: "12px", color: "#888", margin: "0 0 16px" }}>{new Date(badge.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>

            <p style={{ fontSize: "11px", color: "#555", margin: "0 0 4px", letterSpacing: "2px" }}>BADGE ID</p>
            <p style={{ fontSize: "10px", color: "#444", margin: 0, wordBreak: "break-all" }}>{badge.uuid}</p>
          </div>
        </div>

        {/* Action buttons */}
        {!isRevoked && (
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "32px" }}>
            <a href={linkedinShareUrl.toString()} target="_blank" rel="noopener noreferrer"
              style={{ background: "#0077b5", color: "#fff", padding: "10px 16px", borderRadius: "6px", textDecoration: "none", fontSize: "12px", fontFamily: "sans-serif" }}>
              Post on LinkedIn
            </a>
            <a href={linkedinAddUrl.toString()} target="_blank" rel="noopener noreferrer"
              style={{ background: "#004182", color: "#fff", padding: "10px 16px", borderRadius: "6px", textDecoration: "none", fontSize: "12px", fontFamily: "sans-serif" }}>
              Add to LinkedIn Profile
            </a>
            <a href={`/api/verify/${badge.uuid}/download`}
              style={{ background: "#1a1a2e", border: "1px solid #333", color: "#aaa", padding: "10px 16px", borderRadius: "6px", textDecoration: "none", fontSize: "12px" }}>
              Download OBv3 JSON
            </a>
          </div>
        )}

        {/* Issuer info */}
        <div style={{ borderTop: "1px solid #1a1a2e", paddingTop: "24px" }}>
          <p style={{ fontSize: "11px", color: "#333", margin: "0 0 4px", letterSpacing: "2px" }}>ISSUED BY</p>
          <p style={{ fontSize: "13px", color: "#555", margin: 0 }}>EyesOpen Association · eyesopensecurity.com</p>
          <p style={{ fontSize: "10px", color: "#222", margin: "4px 0 0" }}>Open Badges V3 · W3C Verifiable Credential</p>
        </div>

      </div>
    </div>
  );
}
