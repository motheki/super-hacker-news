import type { Metadata, Viewport } from "next";
import { Geist_Pixel } from "next/font/google";
import type { ReactNode } from "react";
import { Header } from "~/components/Header";
import { JsonLd } from "~/components/JsonLd";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  SOCIAL_IMAGE_PATH,
} from "~/lib/site";
import "./globals.css";

const geistPixel = Geist_Pixel({
  subsets: ["latin"],
  variable: "--font-geist-pixel",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "monospace"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  icons: {
    icon: [
      {
        url: "/super-hn-terminal-v1-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/super-hn-terminal-v1.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    shortcut: "/super-hn-terminal-v1.ico",
    apple: [
      {
        url: "/super-hn-terminal-v1-apple.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [SOCIAL_IMAGE_PATH],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [SOCIAL_IMAGE_PATH],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e6ebe9" },
    { media: "(prefers-color-scheme: dark)", color: "#202523" },
  ],
};

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Next.js supplies ReactNode with framework-owned mutable portal internals.
export default function RootLayout({
  children,
}: Readonly<{ children: Readonly<ReactNode> }>) {
  return (
    <html lang="en" className={geistPixel.variable}>
      <head>
        <link
          rel="mask-icon"
          href="/super-hn-terminal-v1-mask.svg"
          color="#242927"
        />
      </head>
      <body className="min-h-dvh px-2 pb-4">
        <JsonLd
          value={{
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE_NAME,
            description: SITE_DESCRIPTION,
            url: SITE_URL,
          }}
        />
        <div className="mx-auto max-w-3xl">
          <Header />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
