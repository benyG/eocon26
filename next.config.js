/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    domains: [],
  },
  experimental: {
    instrumentationHook: true,
    outputFileTracingIncludes: {
      "/api/admin/submissions": ["./node_modules/pdfkit/js/data/**/*"],
      // Certificate PDF embeds the badge SVG with DejaVu fonts (glyph coverage
      // for the badge icons) — make sure they ship in the standalone output.
      "/api/verify/[uuid]/certificate": ["./assets/fonts/**/*", "./node_modules/pdfkit/js/data/**/*"],
    },
  },
}

module.exports = nextConfig
