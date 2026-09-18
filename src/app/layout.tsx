import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { headers } from "next/headers";
import { SITE } from "@/config/site";
import { FirebaseAnalytics } from "@/components/analytics/FirebaseAnalytics";
import "./globals.css";

const poppins = Poppins({ subsets: ["latin", "devanagari"], weight: ["400", "500", "600", "700"], variable: "--font-poppins", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "Super Shine", "Pitambari Liquid", "copper cleaner Nepal", "brass cleaner", "copper and brass care",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: SITE.locale,
    url: SITE.url,
    title: SITE.title,
    description: SITE.description,
    images: [
      {
        url: "/shine/03_Website_Visuals/super-shine-website-hero-banner.png",
        width: 1672,
        height: 941,
        alt: "Super Shine Pitambari Liquid copper and brass cleaner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
    images: ["/shine/03_Website_Visuals/super-shine-website-hero-banner.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  formatDetection: { telephone: true, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: "#9b201f",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Set by proxy.ts alongside the Content-Security-Policy header.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      className={`no-js ${poppins.variable}`}
      // The inline script below swaps no-js for js before hydration, so the
      // server and client class lists legitimately differ on this element.
      suppressHydrationWarning
    >
      <body>
        {/*
          Swap no-js -> js before first paint so reveal animations start hidden
          only when there is JavaScript available to reveal them again.
        */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.remove("no-js");document.documentElement.classList.add("js");`,
          }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-forest focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        {children}
        <FirebaseAnalytics />
      </body>
    </html>
  );
}
