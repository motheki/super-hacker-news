import { describe, expect, test } from "bun:test";
import { readFile, stat } from "node:fs/promises";
import sharp from "sharp";

const ASSET_DIR = new URL("../assets/", import.meta.url);
const ROOT = new URL("../../", import.meta.url);
const PUBLIC_DIR = new URL("../../public/", import.meta.url);
const HEADER = new URL("../components/Header.astro", import.meta.url);
const LAYOUT = new URL("../layouts/BaseLayout.astro", import.meta.url);
const MASTER_NAME = "super-hn-gourd.png";
const SOCIAL_NAME = "super-hn-social.png";
const HERO_PATH = "docs/images/super-hn-gourd-banner.png";
const VERSIONED_FAVICON_NAME = "super-hn-gourd.ico";
const ICO_HEADER_SIZE = 6;
const ICO_ENTRY_SIZE = 16;
const ICO_LENGTH_OFFSET = 8;
const ICO_DATA_OFFSET = 12;
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
  "header-icon-192.png": { maxBytes: 5_000, width: 192, height: 192 },
  "header-icon-192-dark.png": { maxBytes: 6_000, width: 192, height: 192 },
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

  test("header uses the high-resolution theme icons", async () => {
    const source = await readFile(HEADER, "utf8");

    expect(source).toContain("header-icon-192.png");
    expect(source).toContain("header-icon-192-dark.png");
    expect(source).not.toContain("favicon-32.png");
    expect(source).not.toContain("favicon-32-dark.png");
  });

  test("preloads only the primary text font", async () => {
    const source = await readFile(LAYOUT, "utf8");
    const mono = source.match(
      /<Font cssVariable="--font-dm-mono"[^>]*\/>/u,
    )?.[0];

    expect(source.match(/<Font/gu)).toHaveLength(2);
    expect(source).toContain('cssVariable="--font-dm-sans"');
    expect(mono).toBeDefined();
    expect(mono).not.toContain("preload");
  });

  test("versioned favicon matches the generated gourd", async () => {
    const layout = await readFile(LAYOUT, "utf8");
    const favicon32 = await readFile(new URL("favicon-32.png", ASSET_DIR));
    const legacy = await readFile(new URL("favicon.ico", PUBLIC_DIR));
    const versioned = await readFile(
      new URL(VERSIONED_FAVICON_NAME, PUBLIC_DIR),
    );
    const entry = ICO_HEADER_SIZE + ICO_ENTRY_SIZE;
    const length = versioned.readUInt32LE(entry + ICO_LENGTH_OFFSET);
    const offset = versioned.readUInt32LE(entry + ICO_DATA_OFFSET);

    expect(versioned).toEqual(legacy);
    expect(versioned.subarray(offset, offset + length)).toEqual(favicon32);
    expect(layout).toContain(`href="/${VERSIONED_FAVICON_NAME}"`);
    expect(layout).not.toContain('href="/favicon.ico"');
  });
});
