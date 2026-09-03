import type { NextConfig } from "next";

const FEED_CACHE = { stale: 30, revalidate: 60, expire: 600 } as const;
const POST_CACHE = { stale: 30, revalidate: 60, expire: 300 } as const;
const USER_CACHE = { stale: 900, revalidate: 3_600, expire: 86_400 } as const;
const ITEM_CACHE = {
  stale: 86_400,
  revalidate: 604_800,
  expire: 31_536_000,
} as const;
const ROOT_CACHE = ITEM_CACHE;
const STORY_IDS_CACHE = {
  stale: 3_600,
  revalidate: 3_600,
  expire: 86_400,
} as const;
const exposeTestingApi = process.env.EXPOSE_TESTING_API === "1";

const nextConfig: NextConfig = {
  agentRules: false,
  cacheComponents: true,
  cacheLife: {
    feed: FEED_CACHE,
    item: ITEM_CACHE,
    post: POST_CACHE,
    root: ROOT_CACHE,
    storyIds: STORY_IDS_CACHE,
    user: USER_CACHE,
  },
  reactCompiler: true,
  partialPrefetching: true,
  poweredByHeader: false,
  typedRoutes: true,
  experimental: {
    exposeTestingApiInProductionBuild: exposeTestingApi,
    inlineCss: true,
    prefetchInlining: true,
    staleTimes: {
      dynamic: FEED_CACHE.stale,
    },
    turbopackRustReactCompiler: true,
    useTypeScriptCli: true,
  },
  redirects() {
    return Promise.resolve([
      {
        source: "/",
        destination: "/top",
        permanent: false,
      },
    ]);
  },
};

export default nextConfig;
