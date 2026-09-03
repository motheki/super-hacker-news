/// <reference types="astro/client" />
/// <reference types="@astrojs/cloudflare/types.d.ts" />

interface CacheStorage {
  readonly default: Cache;
}

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

declare module "cloudflare:workers" {
  export const env: Env;
}
