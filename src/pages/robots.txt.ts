import type { APIRoute } from "astro";
import { SITE_URL } from "~/lib/site";

const BLOCKED_AI_CRAWLERS = [
  "AI2Bot",
  "Amazonbot",
  "anthropic-ai",
  "Applebot-Extended",
  "Bytespider",
  "CCBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "cohere-ai",
  "DeepSeekBot",
  "Diffbot",
  "FacebookBot",
  "Google-Extended",
  "GPTBot",
  "meta-externalagent",
  "OAI-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
] as const;

export const prerender = true;

export const GET: APIRoute = () => {
  const blocked = BLOCKED_AI_CRAWLERS.map(
    (crawler) => `User-agent: ${crawler}\nDisallow: /`,
  ).join("\n\n");
  const body = `User-agent: *\nAllow: /\nDisallow: /cdn-cgi/\n\n${blocked}\n\nSitemap: ${SITE_URL}/sitemap.xml\nHost: ${SITE_URL}\n`;

  return new Response(body, {
    headers: {
      "cache-control": "public, max-age=86400",
      "content-type": "text/plain; charset=utf-8",
    },
  });
};
