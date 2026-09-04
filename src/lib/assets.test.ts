import { describe, expect, test } from "bun:test";
import { readFile, stat } from "node:fs/promises";
import sharp from "sharp";

const ASSET_DIR = new URL("../assets/", import.meta.url);
const ROOT = new URL("../../", import.meta.url);
const MASTER_NAME = "super-hn-gourd.png";
const SOCIAL_NAME = "super-hn-social.png";
const HERO_PATH = "docs/images/super-hn-gourd-banner.png";
const MARK_COLORS = new Set(["33,32,32", "217,196,168"]);
const ASSET_SPECS = {
  [MASTER_NAME]: {
    maxBytes: 60_000,
    width: 1_024,
    height: 1_024,
  },
  "apple-touch-icon.png": { maxBytes: 5_000, width: 180, height: 180 },
  "favicon-32.png": { maxBytes: 1_000, width: 32, height: 32 },
  "favicon-32-dark.png": { maxBytes: 1_000, width: 32, height: 32 },
  "icon-192.png": { maxBytes: 5_000, width: 192, height: 192 },
  "icon-512.png": { maxBytes: 20_000, width: 512, height: 512 },
  [SOCIAL_NAME]: { maxBytes: 30_000, width: 1_280, height: 640 },
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

  test("master uses only the two theme tones", async () => {
    const image = await readFile(new URL(MASTER_NAME, ASSET_DIR));
    const { data, info } = await sharp(image)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const colors = new Set<string>();

    for (let offset = 0; offset < data.length; offset += info.channels) {
      const alpha = data[offset + 3] ?? 0;

      if (alpha === 0) continue;

      colors.add(
        `${data[offset] ?? 0},${data[offset + 1] ?? 0},${data[offset + 2] ?? 0}`,
      );
    }

    expect(colors).toEqual(MARK_COLORS);
  });

  test("GitHub hero matches the social image", async () => {
    const social = await readFile(new URL(SOCIAL_NAME, ASSET_DIR));
    const hero = await readFile(new URL(HERO_PATH, ROOT));

    expect(hero).toEqual(social);
  });
});
