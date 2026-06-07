/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    domains: [],
  },
  experimental: {
    outputFileTracingIncludes: {
      "/api/admin/submissions": ["./node_modules/pdfkit/js/data/**/*"],
    },
  },
}

module.exports = nextConfig
