import { LEGACY_SITE_HOST, SITE_URL } from "./site";

const NO_STORE = "no-store";
const PERMANENT_REDIRECT_STATUS = 308;
const SITE_HOST = new URL(SITE_URL).hostname;
const HTTP_SCHEME = "http";

function externalScheme(request: Request) {
  const visitor = request.headers.get("cf-visitor");
  if (visitor !== null) {
    try {
      const value: unknown = JSON.parse(visitor);
      if (
        typeof value === "object" &&
        value !== null &&
        "scheme" in value &&
        typeof value.scheme === "string"
      ) {
        return value.scheme;
      }
    } catch {
      // Ignore malformed edge metadata and use the standard fallbacks.
    }
  }

  const forwarded = request.headers
    .get("x-forwarded-proto")
    ?.split(",", 1)[0]
    ?.trim();
  if (forwarded !== undefined && forwarded.length > 0) return forwarded;

  return new URL(request.url).protocol.slice(0, -1);
}

function redirectToHttps(url: URL) {
  const target = new URL(`${url.pathname}${url.search}`, SITE_URL);
  return new Response(null, {
    headers: {
      "cache-control": NO_STORE,
      location: target.href,
    },
    status: PERMANENT_REDIRECT_STATUS,
  });
}

export function redirectHttp(url: URL) {
  if (url.protocol !== "http:" || url.hostname !== SITE_HOST) return null;

  return redirectToHttps(url);
}

export function redirectInsecure(request: Request) {
  const url = new URL(request.url);
  if (url.hostname !== SITE_HOST || externalScheme(request) !== HTTP_SCHEME) {
    return null;
  }

  return redirectToHttps(url);
}

export function redirectLegacy(url: URL) {
  if (url.hostname !== LEGACY_SITE_HOST) return null;

  const target = new URL(`${url.pathname}${url.search}`, SITE_URL);
  return Response.redirect(target, PERMANENT_REDIRECT_STATUS);
}
