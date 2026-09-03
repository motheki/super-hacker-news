import type { NextConfig } from "next";

const NEWS_CACHE = { stale: 60, revalidate: 60, expire: 3_600 } as const;
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
    news: NEWS_CACHE,
    storyIds: STORY_IDS_CACHE,
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
      dynamic: NEWS_CACHE.stale,
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
