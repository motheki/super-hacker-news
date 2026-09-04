import cloudflare from "@astrojs/cloudflare";
import { cacheCloudflare } from "@astrojs/cloudflare/cache";
import { defineConfig, fontProviders, svgoOptimizer } from "astro/config";

const SITE_URL = "https://super-hn.trevor-opiyo.workers.dev";
const FEED_CACHE_SECONDS = 60;
const FEED_SWR_SECONDS = 300;
const POST_CACHE_SECONDS = 60;
const POST_SWR_SECONDS = 300;
const PROFILE_CACHE_SECONDS = 900;
const PROFILE_SWR_SECONDS = 3_600;
const SITEMAP_CACHE_SECONDS = 3_600;
const SITEMAP_SWR_SECONDS = 86_400;

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
    incrementalBuild: true,
    chromeDevtoolsWorkspace: true,
    clientPrerender: true,
  },
  fonts: [
    {
      cssVariable: "--font-alike",
      display: "swap",
      fallbacks: ["ui-serif", "Georgia", "Cambria", "Times New Roman", "serif"],
      formats: ["woff2"],
      name: "Alike",
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
    "/ask": { maxAge: FEED_CACHE_SECONDS, swr: FEED_SWR_SECONDS },
    "/ask/[page]": { maxAge: FEED_CACHE_SECONDS, swr: FEED_SWR_SECONDS },
    "/new": { maxAge: FEED_CACHE_SECONDS, swr: FEED_SWR_SECONDS },
    "/new/[page]": { maxAge: FEED_CACHE_SECONDS, swr: FEED_SWR_SECONDS },
    "/post/[postId]": {
      maxAge: POST_CACHE_SECONDS,
      swr: POST_SWR_SECONDS,
    },
    "/show": { maxAge: FEED_CACHE_SECONDS, swr: FEED_SWR_SECONDS },
    "/show/[page]": { maxAge: FEED_CACHE_SECONDS, swr: FEED_SWR_SECONDS },
    "/sitemap.xml": {
      maxAge: SITEMAP_CACHE_SECONDS,
      swr: SITEMAP_SWR_SECONDS,
    },
    "/top": { maxAge: FEED_CACHE_SECONDS, swr: FEED_SWR_SECONDS },
    "/top/[page]": { maxAge: FEED_CACHE_SECONDS, swr: FEED_SWR_SECONDS },
    "/user/[userName]": {
      maxAge: PROFILE_CACHE_SECONDS,
      swr: PROFILE_SWR_SECONDS,
    },
  },
  session: false,
  site: SITE_URL,
});
