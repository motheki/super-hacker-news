import { expect, test } from "bun:test";
import { addServerTiming } from "./timing";

test("appends a rounded server timing metric", () => {
  const headers = new Headers({ "server-timing": "cache;dur=2" });

  addServerTiming(headers, "provider", 12.34);

  expect(headers.get("server-timing")).toBe("cache;dur=2, provider;dur=12.3");
});
