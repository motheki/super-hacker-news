import type { NextConfig } from "next";

const exposeTestingApi = process.env.EXPOSE_TESTING_API === "1";

const nextConfig: NextConfig = {
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  experimental: {
    exposeTestingApiInProductionBuild: exposeTestingApi,
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
