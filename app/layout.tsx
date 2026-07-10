import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL || "https://eyesopensecurity.com"),
  title: "EOCON 2026 — 7th Edition | Bilingual Cybersecurity Convention | Douala",
  description:
    "EOCON 2026 — The premier bilingual cybersecurity convention in Africa. November 28, 2026 at Hotel Onomo, Douala, Cameroon. Expert talks, CTF competition, workshops, and more.",
  keywords: "EOCON, cybersecurity convention, Africa, Douala, Cameroon, CTF, information security, EyesOpen",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    title: "EOCON 2026 — Secure the Future",
    description:
      "7th edition of the bilingual cybersecurity convention in Africa. November 28, 2026 · Hotel Onomo, Douala, Cameroon. Expert talks, CTF competition, workshops & networking.",
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
      "7th edition of the bilingual cybersecurity convention in Africa. November 28, 2026 · Hotel Onomo, Douala, Cameroon.",
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
        {/* Facebook Pixel */}
        <Script id="fb-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
          (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','1650436139381871');fbq('track','PageView');
        `}</Script>
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img height="1" width="1" style={{ display: "none" }} alt=""
            src="https://www.facebook.com/tr?id=1650436139381871&ev=PageView&noscript=1" />
        </noscript>
      </body>
    </html>
  );
}
