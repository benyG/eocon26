import type { MetadataRoute } from "next";

// Block crawlers from the networking pages. These per-attendee pages are also
// signature-gated (see /connect/[ticketRef]) — this is the belt-and-braces layer
// that keeps them out of search indexes entirely.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/connect/", "/checkin/", "/admin/", "/api/"],
    },
  };
}
