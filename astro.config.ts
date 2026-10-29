import cloudflare from "@astrojs/cloudflare";
import { cacheCloudflare } from "@astrojs/cloudflare/cache";
import { defineConfig } from "astro/config";
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
