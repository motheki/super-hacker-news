import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	allowedDevOrigins: ["10.0.0.22"],
	reactStrictMode: true,
	async redirects() {
		return [{ source: "/", destination: "/top", permanent: false }];
	},
};

export default nextConfig;
