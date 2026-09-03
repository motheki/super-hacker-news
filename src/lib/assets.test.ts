import { describe, expect, test } from "bun:test";
import { stat } from "node:fs/promises";

const ASSET_DIR = new URL("../assets/", import.meta.url);
const ASSET_BUDGETS = {
  "apple-touch-icon.png": 5_000,
  "favicon-32.png": 1_000,
  "icon-192.png": 5_000,
  "icon-512.png": 16_000,
  "super-hn-social.png": 20_000,
} as const;

describe("derived image budgets", () => {
  for (const [name, maxBytes] of Object.entries(ASSET_BUDGETS)) {
    test(`${name} stays below ${maxBytes} bytes`, async () => {
      const asset = await stat(new URL(name, ASSET_DIR));

      expect(asset.size).toBeLessThanOrEqual(maxBytes);
    });
  }
});
