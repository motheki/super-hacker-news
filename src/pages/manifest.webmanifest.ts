import type { APIRoute } from "astro";
import icon192 from "~/assets/icon-192.png";
import icon512 from "~/assets/icon-512.png";
import { SITE_DESCRIPTION, SITE_NAME } from "~/lib/site";

export const prerender = true;

export const GET: APIRoute = () =>
  Response.json(
    {
      background_color: "#E2E5DE",
      description: SITE_DESCRIPTION,
      display: "standalone",
      icons: [
        {
          sizes: "192x192",
          src: icon192.src,
          type: "image/png",
        },
        {
          purpose: "any maskable",
          sizes: "512x512",
          src: icon512.src,
          type: "image/png",
        },
      ],
      name: SITE_NAME,
      orientation: "portrait",
      short_name: SITE_NAME,
      start_url: "/top",
      theme_color: "#E2E5DE",
    },
    {
      headers: {
        "cache-control": "public, max-age=86400",
        "content-type": "application/manifest+json",
      },
    },
  );
