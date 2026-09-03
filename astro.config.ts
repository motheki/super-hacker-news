import cloudflare from "@astrojs/cloudflare";
import { cacheCloudflare } from "@astrojs/cloudflare/cache";
import { defineConfig, fontProviders, svgoOptimizer } from "astro/config";

const SITE_URL = "https://super-hn.trevor-opiyo.workers.dev";

export default defineConfig({
  adapter: cloudflare({ imageService: "passthrough" }),
  build: {
    inlineStylesheets: "auto",
  },
  cache: {
    provider: cacheCloudflare(),
  },
  compressHTML: true,
  experimental: {
    svgOptimizer: svgoOptimizer(),
  },
  fonts: [
    {
      cssVariable: "--font-quantico",
      display: "swap",
      fallbacks: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      formats: ["woff2"],
      name: "Quantico",
      optimizedFallbacks: true,
      provider: fontProviders.google(),
      styles: ["normal"],
      subsets: ["latin"],
      weights: [400, 700],
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
    "/ask": { maxAge: 30, swr: 30 },
    "/ask/[page]": { maxAge: 30, swr: 30 },
    "/new": { maxAge: 30, swr: 30 },
    "/new/[page]": { maxAge: 30, swr: 30 },
    "/post/[postId]": { maxAge: 15, swr: 300 },
    "/show": { maxAge: 30, swr: 30 },
    "/show/[page]": { maxAge: 30, swr: 30 },
    "/sitemap.xml": { maxAge: 3_600, swr: 3_600 },
    "/top": { maxAge: 30, swr: 30 },
    "/top/[page]": { maxAge: 30, swr: 30 },
    "/user/[userName]": { maxAge: 900, swr: 900 },
  },
  session: false,
  site: SITE_URL,
});
