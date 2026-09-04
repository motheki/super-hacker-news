import { describe, expect, test } from "bun:test";
import { secureResponse } from "./response";

describe("secureResponse", () => {
  test("adds dynamic security headers and an HTML charset", async () => {
    const response = secureResponse(
      new Response("page", { headers: { "content-type": "text/html" } }),
      true,
    );

    expect(response.headers.get("content-type")).toBe(
      "text/html; charset=utf-8",
    );
    expect(response.headers.get("permissions-policy")).toBe(
      "camera=(), geolocation=(), microphone=()",
    );
    expect(response.headers.get("referrer-policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(response.headers.get("strict-transport-security")).toBe(
      "max-age=300",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(await response.text()).toBe("page");
  });

  test("omits HSTS on cleartext development responses", () => {
    const response = secureResponse(new Response("page"), false);

    expect(response.headers.has("strict-transport-security")).toBeFalse();
  });
});
