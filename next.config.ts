import type { NextConfig } from "next";

const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
	.split(",")
	.map(origin => origin.trim())
	.filter(Boolean);

const contentSecurityPolicy = [
	"default-src 'self'",
	`script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: blob:",
	"font-src 'self'",
	"connect-src 'self' https://*.vercel-insights.com",
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'self'",
	"frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
	...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
	cacheComponents: true,
	partialPrefetching: true,
	poweredByHeader: false,
	reactStrictMode: true,
	typedRoutes: true,
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: [
					{ key: "Content-Security-Policy", value: contentSecurityPolicy },
					{
						key: "Permissions-Policy",
						value: "camera=(), microphone=(), geolocation=()",
					},
					{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "X-Frame-Options", value: "DENY" },
				],
			},
		];
	},
	async redirects() {
		return [{ source: "/", destination: "/top", permanent: false }];
	},
};

export default nextConfig;
