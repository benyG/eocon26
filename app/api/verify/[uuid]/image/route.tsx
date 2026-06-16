import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const COLORS: Record<string, string> = {
  participant: "#00ff9d", speaker: "#cc0000", volunteer: "#ff6600",
  ctf_competitor: "#00ccff", ctf_winner: "#ffd700", organizer: "#cc00ff",
};
const LABELS: Record<string, string> = {
  participant: "PARTICIPANT", speaker: "SPEAKER", volunteer: "VOLUNTEER",
  ctf_competitor: "CTF COMPETITOR", ctf_winner: "CTF WINNER", organizer: "ORGANIZER",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

// Renders a PNG (Satori) so the badge image displays when shared on
// LinkedIn / Credly / Twitter — SVG is not rendered by those platforms.
export async function GET(_req: Request, { params }: { params: { uuid: string } }) {
  const badge = await prisma.badgeCredential.findUnique({ where: { uuid: params.uuid } });
  if (!badge) return new Response("Not found", { status: 404 });

  const color = COLORS[badge.badgeType] || "#00ff9d";
  const label = LABELS[badge.badgeType] || badge.badgeType.toUpperCase();
  const revoked = !!badge.revokedAt;
  const issued = new Date(badge.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px", height: "630px", display: "flex", alignItems: "center",
          background: "#0a0a0f", padding: "72px", color: "#e0e0e0", fontFamily: "sans-serif",
        }}
      >
        {/* Badge medallion */}
        <div
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            width: "340px", height: "440px", flexShrink: 0, marginRight: "72px",
            border: `6px solid ${color}`, borderRadius: "28px", background: "#101018",
            boxShadow: `0 0 60px ${color}55`,
          }}
        >
          <div style={{ display: "flex", fontSize: "20px", letterSpacing: "6px", color, marginBottom: "28px" }}>
            EOCON 2026
          </div>
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "180px", height: "180px", borderRadius: "90px", border: `5px solid ${color}`,
              color, fontSize: "76px", fontWeight: 800, marginBottom: "28px",
            }}
          >
            {initials(badge.recipientName)}
          </div>
          <div style={{ display: "flex", fontSize: "24px", fontWeight: 800, color, letterSpacing: "3px" }}>
            {label}
          </div>
        </div>

        {/* Details */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontSize: "20px", letterSpacing: "4px", color, marginBottom: "12px" }}>
            {revoked ? "BADGE REVOKED" : "VERIFIED OPEN BADGE"}
          </div>
          <div style={{ display: "flex", fontSize: "60px", fontWeight: 800, color: "#ffffff", marginBottom: "20px" }}>
            {badge.recipientName}
          </div>
          <div style={{ display: "flex", fontSize: "30px", color, marginBottom: "12px" }}>
            {label}{badge.subtype ? ` · ${badge.subtype}` : ""}
          </div>
          <div style={{ display: "flex", fontSize: "24px", color: "#888", marginBottom: "40px" }}>
            Issued {issued}
          </div>
          <div style={{ display: "flex", fontSize: "22px", color: "#9aa" }}>
            EyesOpen Association · EOCON 2026
          </div>
          <div style={{ display: "flex", fontSize: "18px", color: "#555", marginTop: "8px" }}>
            Open Badges V3 · eyesopensecurity.com
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
