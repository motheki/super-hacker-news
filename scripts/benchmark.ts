import { spawn } from "node:child_process";

const APP_PORT = 3_102;
const APP_URL = `http://localhost:${APP_PORT}`;
const REQUEST_COUNT = 12;
const READY_ATTEMPTS = 50;
const READY_DELAY_MS = 100;
const ROUTES = [
  "/top",
  "/new",
  "/post/49508405",
  "/post/49548395",
  "/post/8863",
  "/user/pg",
] as const;

interface Sample {
  readonly bytes: number;
  readonly totalMs: number;
  readonly ttfbMs: number;
}

function wait(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < READY_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(APP_URL);
      if (response.ok) return;
    } catch {
      await wait(READY_DELAY_MS);
    }
  }

  throw new Error("Benchmark server did not become ready");
}

async function sample(path: string): Promise<Sample> {
  const start = performance.now();
  const response = await fetch(`${APP_URL}${path}`);
  const ttfbMs = performance.now() - start;
  const bytes = (await response.arrayBuffer()).byteLength;

  if (!response.ok) throw new Error(`${path} returned ${response.status}`);

  return { bytes, totalMs: performance.now() - start, ttfbMs };
}

function average(values: readonly number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function run() {
  const server = spawn(
    "bun",
    ["run", "preview", "--", "--port", String(APP_PORT)],
    {
      env: { ...process.env, ASTRO_PREVIEW_BACKGROUND: "0" },
      stdio: "ignore",
    },
  );

  try {
    await waitForServer();

    const rows = [];
    for (const path of ROUTES) {
      const samples: Sample[] = [];
      for (let index = 0; index < REQUEST_COUNT; index += 1) {
        samples.push(await sample(path));
      }

      const [cold, ...warm] = samples;
      if (cold === undefined) continue;

      rows.push({
        route: path,
        "cold total ms": cold.totalMs.toFixed(1),
        "warm TTFB ms": average(warm.map(({ ttfbMs }) => ttfbMs)).toFixed(1),
        "warm total ms": average(warm.map(({ totalMs }) => totalMs)).toFixed(1),
        bytes: cold.bytes,
      });
    }

    console.table(rows);
  } finally {
    server.kill("SIGTERM");
  }
}

await run();
