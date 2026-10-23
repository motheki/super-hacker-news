import cloudflare from "@astrojs/cloudflare";
import { cacheCloudflare } from "@astrojs/cloudflare/cache";
import { defineConfig, fontProviders } from "astro/config";
import { SITE_URL } from "./src/lib/site";

const feedCache = { maxAge: 60, swr: 300 };

export default defineConfig({
  adapter: cloudflare({ imageService: "compile" }),
  cache: {
    provider: cacheCloudflare(),
  },
  compressHTML: true,
  experimental: {
    clientPrerender: true,
  },
  fonts: [
    {
      cssVariable: "--font-dm-sans",
      display: "swap",
      fallbacks: ["ui-sans-serif", "system-ui", "sans-serif"],
      formats: ["woff2"],
      name: "DM Sans",
      optimizedFallbacks: true,
      provider: fontProviders.google(),
      styles: ["normal"],
      subsets: ["latin"],
      weights: [400],
    },
    {
      cssVariable: "--font-dm-mono",
      display: "swap",
      fallbacks: [
        "ui-monospace",
        "SFMono-Regular",
        "Menlo",
        "Monaco",
        "Consolas",
        "Liberation Mono",
        "Courier New",
        "monospace",
      ],
      formats: ["woff2"],
      name: "DM Mono",
      optimizedFallbacks: true,
      provider: fontProviders.google(),
      styles: ["normal"],
      subsets: ["latin"],
      weights: [400],
    },
  ],
  output: "server",
  prefetch: {
    defaultStrategy: "tap",
    prefetchAll: false,
  },
  redirects: {
    "/": {
      destination: "/top",
      status: 302,
    },
  },
  routeRules: {
    "/ask/[...page]": feedCache,
    "/new/[...page]": feedCache,
    "/show/[...page]": feedCache,
    "/top/[...page]": feedCache,
    "/sitemap.xml": { maxAge: 3_600, swr: 86_400 },
    "/user/[userName]": { maxAge: 900, swr: 3_600 },
  },
  session: false,
  site: SITE_URL,
});
