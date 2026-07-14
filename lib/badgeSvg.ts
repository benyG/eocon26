export type BadgeType = "participant" | "speaker" | "volunteer" | "ctf_competitor" | "ctf_winner" | "organizer";

const BADGE_COLORS: Record<BadgeType, { primary: string; secondary: string; glow: string }> = {
  participant:    { primary: "#00ff9d", secondary: "#00cc7d", glow: "#00ff9d40" },
  speaker:        { primary: "#cc0000", secondary: "#990000", glow: "#cc000040" },
  volunteer:      { primary: "#ff6600", secondary: "#cc5200", glow: "#ff660040" },
  ctf_competitor: { primary: "#00ccff", secondary: "#0099cc", glow: "#00ccff40" },
  ctf_winner:     { primary: "#ffd700", secondary: "#ccaa00", glow: "#ffd70060" },
  organizer:      { primary: "#cc00ff", secondary: "#9900cc", glow: "#cc00ff40" },
};

const BADGE_LABELS: Record<BadgeType, string> = {
  participant:    "PARTICIPANT",
  speaker:        "SPEAKER",
  volunteer:      "VOLUNTEER",
  ctf_competitor: "CTF COMPETITOR",
  ctf_winner:     "CTF WINNER",
  organizer:      "ORGANIZER",
};

const BADGE_ICONS: Record<BadgeType, string> = {
  participant:    "◈",
  speaker:        "◆",
  volunteer:      "◉",
  ctf_competitor: "⚡",
  ctf_winner:     "🏆",
  organizer:      "◎",
};

// Pointy-top hexagon, R=130, center=(150,165), viewBox="0 0 300 330"
const HEX_OUTER = "150,22 267,87 267,217 150,282 33,217 33,87";
const HEX_INNER = "150,36 253,97 253,207 150,268 47,207 47,97";
const HEX_CLIP = "150,28 262,93 262,213 150,278 38,213 38,93";

export function generateBadgeSvg(
  type: BadgeType,
  recipientName: string,
  year: string = "2026",
  subtype?: string | null,
): string {
  const { primary, secondary, glow } = BADGE_COLORS[type];
  const label = BADGE_LABELS[type];
  const icon = BADGE_ICONS[type];
  const sublabel = subtype ? subtype.toUpperCase() : null;

  // Truncate name to fit
  const displayName = recipientName.length > 20 ? recipientName.slice(0, 18) + "…" : recipientName;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 330" width="300" height="330">
  <defs>
    <clipPath id="hexClip">
      <polygon points="${HEX_CLIP}" />
    </clipPath>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <radialGradient id="bgGrad" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#0a0a0f"/>
    </radialGradient>
    <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${glow}"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
  </defs>

  <!-- Outer glow hex -->
  <polygon points="${HEX_OUTER}" fill="none" stroke="${primary}" stroke-width="3" opacity="0.3" filter="url(#glow)"/>

  <!-- Background fill -->
  <polygon points="${HEX_INNER}" fill="url(#bgGrad)" clip-path="url(#hexClip)"/>

  <!-- Inner glow overlay -->
  <polygon points="${HEX_INNER}" fill="url(#glowGrad)" opacity="0.15"/>

  <!-- Border hex -->
  <polygon points="${HEX_OUTER}" fill="none" stroke="${primary}" stroke-width="2.5"/>
  <polygon points="${HEX_INNER}" fill="none" stroke="${secondary}" stroke-width="1" opacity="0.5"/>

  <!-- Binary watermark line (kept in the wide band so it never crosses the hex walls) -->
  <text x="150" y="118" text-anchor="middle" font-family="monospace" font-size="7" fill="${primary}" opacity="0.08" letter-spacing="3">01001101 00110001</text>

  <!-- EOCON label top -->
  <text x="150" y="72" text-anchor="middle" font-family="'Share Tech Mono', monospace, sans-serif" font-size="10" fill="${primary}" letter-spacing="4" opacity="0.8">EOCON ${year}</text>

  <!-- Decorative line under EOCON -->
  <line x1="100" y1="78" x2="200" y2="78" stroke="${primary}" stroke-width="0.5" opacity="0.4"/>

  <!-- Icon -->
  <text x="150" y="145" text-anchor="middle" font-family="sans-serif" font-size="40" fill="${primary}" filter="url(#glow)">${icon}</text>

  <!-- Recipient name -->
  <text x="150" y="178" text-anchor="middle" font-family="Georgia, serif" font-size="13" fill="#ffffff" font-style="italic">${displayName}</text>

  <!-- Decorative line -->
  <line x1="90" y1="186" x2="210" y2="186" stroke="${primary}" stroke-width="0.5" opacity="0.5"/>

  <!-- Badge type label -->
  <text x="150" y="202" text-anchor="middle" font-family="'Share Tech Mono', monospace, sans-serif" font-size="11" fill="${primary}" letter-spacing="2" font-weight="bold">${label}</text>

  ${sublabel ? `<!-- Subtype (ticket level) -->
  <text x="150" y="217" text-anchor="middle" font-family="'Share Tech Mono', monospace, sans-serif" font-size="9" fill="${secondary}" letter-spacing="3" opacity="0.8">${sublabel}</text>` : ""}

  <!-- Issuer + year, centered in the wide-enough band so nothing crosses the hex walls -->
  <text x="150" y="233" text-anchor="middle" font-family="monospace" font-size="7" fill="#777777" letter-spacing="0.8">EYESOPEN SECURITY · ${year}</text>
</svg>`;
}

export function svgToBase64(svg: string): string {
  return Buffer.from(svg).toString("base64");
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${svgToBase64(svg)}`;
}
