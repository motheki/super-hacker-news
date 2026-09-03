import type { NextConfig } from "next";

const exposeTestingApi = process.env.EXPOSE_TESTING_API === "1";

const nextConfig: NextConfig = {
  agentRules: false,
  cacheComponents: true,
  reactCompiler: true,
  partialPrefetching: true,
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  compiler: {
    styledComponents: true,
  },
  experimental: {
    exposeTestingApiInProductionBuild: exposeTestingApi,
    inlineCss: true,
    turbopackRustReactCompiler: true,
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
