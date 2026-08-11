import type { Metadata, Viewport } from "next";
import { Geist_Pixel } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";
import { Header } from "~/components/Header";
import { JsonLd } from "~/components/JsonLd";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, SOCIAL_IMAGE_PATH } from "~/lib/site";
import { getThemeColor, LEGACY_THEME_STORAGE_KEY, THEME_STORAGE_KEY, THEMES } from "~/lib/theme";
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
	icons: {
		icon: [
			{ url: "/favicon.ico", sizes: "any" },
			{ url: "/favicon.svg", type: "image/svg+xml" },
		],
		apple: "/apple-touch-icon.png",
	},
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	colorScheme: "light dark",
};

// This runs before paint so the persisted theme does not flash during hydration.
const themeScript = `
(() => {
  const key = ${JSON.stringify(THEME_STORAGE_KEY)};
  const legacyKey = ${JSON.stringify(LEGACY_THEME_STORAGE_KEY)};
	const lightThemeColor = ${JSON.stringify(getThemeColor(THEMES.LIGHT))};
	const darkThemeColor = ${JSON.stringify(getThemeColor(THEMES.DARK))};
  const colorScheme = matchMedia("(prefers-color-scheme: dark)");
  const applyTheme = (theme) => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.dataset.theme = theme;
	document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? darkThemeColor : lightThemeColor);
  };
  const updateFromSystem = () => {
    try {
      if (localStorage.getItem(key) !== null) return;
    } catch {}
    applyTheme(colorScheme.matches ? "dark" : "light");
  };
  let theme = colorScheme.matches ? "dark" : "light";
  try {
    const storedTheme = localStorage.getItem(key);
    if (storedTheme === "light" || storedTheme === "dark") {
      theme = storedTheme;
    } else {
      const legacyTheme = localStorage.getItem(legacyKey);
      if (legacyTheme === "light" || legacyTheme === "dark") {
        theme = legacyTheme;
        localStorage.setItem(key, legacyTheme);
      }
    }
    localStorage.removeItem(legacyKey);
  } catch {}
  applyTheme(theme);
  colorScheme.addEventListener("change", updateFromSystem);
  window.addEventListener("pageshow", updateFromSystem);
})();`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang="en" className={geistPixel.variable} suppressHydrationWarning>
			<head>
				<meta
					name="theme-color"
					content={getThemeColor(THEMES.LIGHT)}
					suppressHydrationWarning
				/>
				<Script id="theme-initializer" strategy="beforeInteractive">
					{themeScript}
				</Script>
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
