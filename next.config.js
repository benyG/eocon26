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
    },
  },
}

module.exports = nextConfig
