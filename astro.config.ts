import { defineConfig } from "astro/config";
import pagefind from "astro-pagefind";
import hackerNewsSnapshot from "./src/integrations/snapshot";
import { SITE_URL } from "./src/lib/site";
export default defineConfig({
  output: "static",
  compressHTML: true,
  trailingSlash: "never",
  prefetch: { defaultStrategy: "tap", prefetchAll: false },
  redirects: { "/": "/top" },
  site: SITE_URL,
  integrations: [pagefind(), hackerNewsSnapshot()],
});
