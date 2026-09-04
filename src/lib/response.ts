const HTML_TYPE = "text/html";
const HSTS_SECONDS = 300;
const SECURITY_HEADERS = {
  "permissions-policy": "camera=(), geolocation=(), microphone=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
} as const;

export function secureResponse(response: Response, isHttps: boolean) {
  const headers = new Headers(response.headers);

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }
  if (isHttps) {
    headers.set("strict-transport-security", `max-age=${HSTS_SECONDS}`);
  }

  const contentType = headers.get("content-type");
  if (
    contentType?.startsWith(HTML_TYPE) === true &&
    !contentType.toLowerCase().includes("charset=")
  ) {
    headers.set("content-type", `${contentType}; charset=utf-8`);
  }

  // Preserve streaming bodies while applying one response policy.
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}
