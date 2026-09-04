import { LEGACY_SITE_HOST, SITE_URL } from "./site";

export function redirectLegacy(url: URL) {
  if (url.hostname !== LEGACY_SITE_HOST) return null;

  const target = new URL(`${url.pathname}${url.search}`, SITE_URL);
  return Response.redirect(target, 308);
}
