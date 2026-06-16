import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL || "https://eyesopensecurity.com"),
  title: "EOCON 2026 — 7th Edition | Bilingual Cybersecurity Conference | Douala",
  description:
    "EOCON 2026 — The premier bilingual cybersecurity conference in Africa. November 28, 2026 at Hotel Onomo, Douala, Cameroon. Expert talks, CTF competition, workshops, and more.",
  keywords: "EOCON, cybersecurity conference, Africa, Douala, Cameroon, CTF, information security, EyesOpen",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    title: "EOCON 2026 — Secure the Future",
    description:
      "7th edition of the bilingual cybersecurity conference in Africa. November 28, 2026 · Hotel Onomo, Douala, Cameroon. Expert talks, CTF competition, workshops & networking.",
    url: "/",
    siteName: "EOCON 2026",
    type: "website",
    locale: "en_US",
    images: [
      { url: "/api/og-image", width: 492, height: 772, alt: "EOCON 2026 — Stay Tuned" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EOCON 2026 — Secure the Future",
    description:
      "7th edition of the bilingual cybersecurity conference in Africa. November 28, 2026 · Hotel Onomo, Douala, Cameroon.",
    images: ["/api/og-image"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        <div className="scanlines" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
