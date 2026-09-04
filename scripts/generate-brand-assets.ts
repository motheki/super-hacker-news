import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const ROOT = new URL("../", import.meta.url);
const ASSET_DIR = new URL("src/assets/", ROOT);
const DOCS_DIR = new URL("docs/images/", ROOT);
const PUBLIC_DIR = new URL("public/", ROOT);

const MASTER_NAME = "super-hn-fly-whisk.png";
const SOCIAL_NAME = "super-hn-social.png";
const HERO_NAME = "super-hn-fly-whisk-banner.png";
const MASTER_SIZE = 1_024;
const SOCIAL_WIDTH = 1_280;
const SOCIAL_HEIGHT = 640;
const SOCIAL_MARK_SIZE = 480;
const ICON_SCALE = 0.82;
const ALPHA_STEPS = 15;
const BACKGROUND_MIN = 225;
const BACKGROUND_RANGE = 12;
const PNG_COLORS = 8;
const PNG_OPTIONS = {
  compressionLevel: 9,
  adaptiveFiltering: true,
  palette: true,
  colors: PNG_COLORS,
  dither: 0,
  effort: 10,
} as const;

const PALETTE = {
  parchment: "#d9c4a8",
  ink: "#212020",
  silver: "#c3c3c4",
  line: "#a79077",
  darkCanvas: "#0f0e0f",
} as const;

const MARK_COLORS = [
  PALETTE.parchment,
  PALETTE.ink,
  PALETTE.silver,
  PALETTE.line,
].map(toRgb);

type Rgb = Readonly<{ r: number; g: number; b: number }>;

function assetPath(name: string): string {
  return fileURLToPath(new URL(name, ASSET_DIR));
}

function toRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function nearest(r: number, g: number, b: number): Rgb {
  let match = toRgb(PALETTE.parchment);
  let distance = Number.POSITIVE_INFINITY;

  for (const color of MARK_COLORS) {
    const candidate =
      (r - color.r) ** 2 + (g - color.g) ** 2 + (b - color.b) ** 2;

    if (candidate >= distance) continue;

    match = color;
    distance = candidate;
  }

  return match;
}

async function importMaster(source: string): Promise<void> {
  const image = sharp(source).resize(MASTER_SIZE, MASTER_SIZE, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Lock the generated art to the application palette.
  for (let offset = 0; offset < data.length; offset += info.channels) {
    const red = data[offset] ?? 0;
    const green = data[offset + 1] ?? 0;
    const blue = data[offset + 2] ?? 0;
    const range = Math.max(red, green, blue) - Math.min(red, green, blue);

    // Remove a generated white checkerboard while retaining silver details.
    if (
      Math.min(red, green, blue) >= BACKGROUND_MIN &&
      range <= BACKGROUND_RANGE
    ) {
      data[offset + 3] = 0;
      continue;
    }

    const color = nearest(red, green, blue);
    const alpha = data[offset + 3] ?? 255;

    data[offset] = color.r;
    data[offset + 1] = color.g;
    data[offset + 2] = color.b;
    data[offset + 3] =
      Math.round((alpha / 255) * ALPHA_STEPS) * (255 / ALPHA_STEPS);
  }

  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png(PNG_OPTIONS)
    .toFile(assetPath(MASTER_NAME));
}

async function mark(size: number): Promise<Buffer> {
  return sharp(assetPath(MASTER_NAME))
    .resize(size, size, { fit: "contain" })
    .png(PNG_OPTIONS)
    .toBuffer();
}

async function splitCanvas(
  width: number,
  height: number,
  markSize: number,
): Promise<Buffer> {
  const left = Math.floor(width / 2);
  const logo = await mark(markSize);

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: PALETTE.parchment,
    },
  })
    .composite([
      {
        input: {
          create: {
            width: width - left,
            height,
            channels: 4,
            background: PALETTE.darkCanvas,
          },
        },
        left,
        top: 0,
      },
      {
        input: logo,
        left: Math.floor((width - markSize) / 2),
        top: Math.floor((height - markSize) / 2),
      },
    ])
    .png(PNG_OPTIONS)
    .toBuffer();
}

async function appIcon(size: number): Promise<Buffer> {
  return splitCanvas(size, size, Math.round(size * ICON_SCALE));
}

function ico(images: readonly Buffer[], sizes: readonly number[]): Buffer {
  const headerSize = 6;
  const entrySize = 16;
  const entriesSize = entrySize * images.length;
  const header = Buffer.alloc(headerSize + entriesSize);
  let offset = header.length;

  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  images.forEach((image, index) => {
    const entry = headerSize + index * entrySize;
    const size = sizes[index];

    if (size === undefined) throw new Error("Missing icon size");

    header.writeUInt8(size === 256 ? 0 : size, entry);
    header.writeUInt8(size === 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(image.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += image.length;
  });

  return Buffer.concat([header, ...images]);
}

async function generate(): Promise<void> {
  const source = process.argv[2];

  if (source) await importMaster(source);

  const favicon16 = await mark(16);
  const favicon32 = await mark(32);
  const apple = await appIcon(180);
  const icon192 = await appIcon(192);
  const icon512 = await appIcon(512);
  const social = await splitCanvas(
    SOCIAL_WIDTH,
    SOCIAL_HEIGHT,
    SOCIAL_MARK_SIZE,
  );

  await Promise.all([
    writeFile(new URL("favicon-32.png", ASSET_DIR), favicon32),
    writeFile(new URL("apple-touch-icon.png", ASSET_DIR), apple),
    writeFile(new URL("icon-192.png", ASSET_DIR), icon192),
    writeFile(new URL("icon-512.png", ASSET_DIR), icon512),
    writeFile(new URL(SOCIAL_NAME, ASSET_DIR), social),
    writeFile(
      new URL("favicon.ico", PUBLIC_DIR),
      ico([favicon16, favicon32], [16, 32]),
    ),
    writeFile(new URL(HERO_NAME, DOCS_DIR), social),
  ]);
}

await generate();
