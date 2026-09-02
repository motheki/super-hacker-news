import type { Metadata, Viewport } from "next";
import { Geist_Pixel } from "next/font/google";
import Script from "next/script";
import { Suspense, type ReactNode } from "react";
import { Header } from "~/components/Header";
import { JsonLd } from "~/components/JsonLd";
import { ScrollPolicy } from "~/components/ScrollPolicy";
import {
  SCROLL_ENTRY_STATE,
  SCROLL_POSITIONS_WINDOW,
  SCROLL_TRAVERSE_ATTR,
} from "~/lib/scroll";
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

const SCROLL_POLICY_ID = "scroll-policy-init";
const INIT_SCROLL_POLICY = `
(function () {
  const entryState = "${SCROLL_ENTRY_STATE}";
  const positionsState = "${SCROLL_POSITIONS_WINDOW}";
  const pushState = history.pushState;
  const replaceState = history.replaceState;
  const makeEntry = () => crypto.randomUUID();
  const addEntry = (state, entry) => ({ ...(state ?? {}), [entryState]: entry });

  window[positionsState] = new Map();
  replaceState.call(history, addEntry(history.state, makeEntry()), "");
  history.pushState = function (state, title, url) {
    const currentEntry = history.state?.[entryState];
    if (currentEntry) window[positionsState].set(currentEntry, scrollY);

    return pushState.call(this, addEntry(state, makeEntry()), title, url);
  };
  history.replaceState = function (state, title, url) {
    const entry = history.state?.[entryState] ?? makeEntry();
    return replaceState.call(this, addEntry(state, entry), title, url);
  };

  history.scrollRestoration = "manual";
  addEventListener("popstate", (event) => {
    document.documentElement.setAttribute(
      "${SCROLL_TRAVERSE_ATTR}",
      event.state?.[entryState] ?? "",
    );
  });
  addEventListener("load", () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!location.hash) scrollTo(0, 0);
      });
    });
  }, { once: true });
})();
`;

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
        <Script id={SCROLL_POLICY_ID} strategy="beforeInteractive">
          {INIT_SCROLL_POLICY}
        </Script>
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
        <Suspense fallback={null}>
          <ScrollPolicy />
        </Suspense>
        <div className="mx-auto max-w-3xl">
          <Header />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
