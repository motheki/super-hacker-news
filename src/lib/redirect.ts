import { LEGACY_SITE_HOST, SITE_URL } from "./site";

const SITE_HOST = new URL(SITE_URL).hostname;

export function redirectHttp(url: URL) {
  if (url.protocol !== "http:" || url.hostname !== SITE_HOST) return null;

  const target = new URL(`${url.pathname}${url.search}`, SITE_URL);
  return Response.redirect(target, 308);
}

export function redirectLegacy(url: URL) {
  if (url.hostname !== LEGACY_SITE_HOST) return null;

  const target = new URL(`${url.pathname}${url.search}`, SITE_URL);
  return Response.redirect(target, 308);
}
