import { describe, expect, test } from "bun:test";
import { readFile, stat } from "node:fs/promises";
import sharp from "sharp";

const ASSET_DIR = new URL("../assets/", import.meta.url);
const ROOT = new URL("../../", import.meta.url);
const ASSET_SPECS = {
  "super-hn-fly-whisk.png": {
    maxBytes: 60_000,
    width: 1_024,
    height: 1_024,
  },
  "apple-touch-icon.png": { maxBytes: 5_000, width: 180, height: 180 },
  "favicon-32.png": { maxBytes: 1_000, width: 32, height: 32 },
  "icon-192.png": { maxBytes: 5_000, width: 192, height: 192 },
  "icon-512.png": { maxBytes: 20_000, width: 512, height: 512 },
  "super-hn-social.png": { maxBytes: 30_000, width: 1_280, height: 640 },
} as const;

describe("brand images", () => {
  for (const [name, spec] of Object.entries(ASSET_SPECS)) {
    test(`${name} has the expected dimensions and budget`, async () => {
      const assetFile = new URL(name, ASSET_DIR);
      const asset = await stat(assetFile);
      const image = await readFile(assetFile);
      const metadata = await sharp(image).metadata();

      expect(asset.size).toBeLessThanOrEqual(spec.maxBytes);
      expect(metadata.width).toBe(spec.width);
      expect(metadata.height).toBe(spec.height);
    });
  }

  test("GitHub hero matches the social image", async () => {
    const social = await readFile(new URL("super-hn-social.png", ASSET_DIR));
    const hero = await readFile(
      new URL("docs/images/super-hn-fly-whisk-banner.png", ROOT),
    );

    expect(hero).toEqual(social);
  });
});
