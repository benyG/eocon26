import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EOCON 2026 — 7th Edition | Bilingual Cybersecurity Conference | Douala",
  description:
    "EOCON 2026 — The premier bilingual cybersecurity conference in Africa. November 28, 2026 at Hotel Onomo, Douala, Cameroon. Expert talks, CTF competition, workshops, and more.",
  keywords: "EOCON, cybersecurity conference, Africa, Douala, Cameroon, CTF, information security, EyesOpen",
  openGraph: {
    title: "EOCON 2026 — Secure the Future",
    description: "7th edition of the bilingual cybersecurity conference. Nov 28, 2026 · Hotel Onomo, Douala.",
    type: "website",
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
