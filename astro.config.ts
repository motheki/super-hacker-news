import cloudflare from "@astrojs/cloudflare";
import { defineConfig, fontProviders, svgoOptimizer } from "astro/config";

const SITE_URL = "https://super-hn.trevor-opiyo.workers.dev";

export default defineConfig({
  adapter: cloudflare({ imageService: "passthrough" }),
  build: {
    inlineStylesheets: "auto",
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
  site: SITE_URL,
});
