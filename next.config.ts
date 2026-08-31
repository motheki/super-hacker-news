import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
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
