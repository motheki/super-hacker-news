const SUPER_HN_URL = "https://superhn.org";
const BETTER_HN_URL = "https://bhn.vercel.app";
const WARM_REQUESTS = 30;
const REQUIRED_POSTS = 10;
const WARM_ROUTES = ["/top", "/post/8863"] as const;
const REFERENCE_POST_IDS = [
  49_543_220, 49_554_643, 49_544_618, 49_550_698, 49_550_772, 49_551_096,
  49_554_520, 49_552_572, 49_548_395, 49_526_453,
] as const;
const RECENT_POST_IDS = [
  49_557_206, 49_548_452, 49_548_600, 49_558_433, 49_555_592, 49_559_330,
  49_559_320, 49_559_069, 49_558_610, 49_559_314,
] as const;

interface Sample {
  readonly bytes: number;
  readonly cache: string;
  readonly path: string;
  readonly status: number;
  readonly totalMs: number;
  readonly ttfbMs: number;
}

function parseUrls() {
  const configured = process.env.BENCHMARK_URLS;
  const urls = configured?.split(",").map((url) => url.trim()) ?? [
    SUPER_HN_URL,
    BETTER_HN_URL,
  ];

  return urls.filter((url) => url.length > 0);
}

function parseIds(name: string, defaults: readonly number[]) {
  const value = process.env[name];
  if (value === undefined) return defaults;

  const ids = value
    .split(",")
    .map((item) => Number(item))
    .filter((item) => Number.isSafeInteger(item) && item > 0);
  if (ids.length < REQUIRED_POSTS) {
    throw new Error(`${name} requires at least ${REQUIRED_POSTS} IDs`);
  }

  return ids.slice(0, REQUIRED_POSTS);
}

export function percentile(values: readonly number[], fraction: number) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil(sorted.length * fraction) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

function summarize(samples: readonly Sample[]) {
  const totals = samples.map(({ totalMs }) => totalMs);
  const ttfbs = samples.map(({ ttfbMs }) => ttfbMs);
  const caches = Object.groupBy(samples, ({ cache }) => cache);

  return {
    bytesMedian: Math.round(
      percentile(
        samples.map(({ bytes }) => bytes),
        0.5,
      ),
    ),
    cache: Object.fromEntries(
      Object.entries(caches).map(([status, entries]) => [
        status,
        entries?.length ?? 0,
      ]),
    ),
    count: samples.length,
    status5xx: samples.filter(({ status }) => status >= 500).length,
    totalP50Ms: Math.round(percentile(totals, 0.5) * 10) / 10,
    totalP95Ms: Math.round(percentile(totals, 0.95) * 10) / 10,
    ttfbP50Ms: Math.round(percentile(ttfbs, 0.5) * 10) / 10,
    ttfbP95Ms: Math.round(percentile(ttfbs, 0.95) * 10) / 10,
  };
}

function withProbe(path: string, runId: string, index: number) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}benchmark=${runId}-${index}`;
}

async function sample(baseUrl: string, path: string): Promise<Sample> {
  const start = performance.now();
  const response = await fetch(`${baseUrl}${path}`, { redirect: "follow" });
  const ttfbMs = performance.now() - start;
  const bytes = (await response.arrayBuffer()).byteLength;

  return {
    bytes,
    cache: response.headers.get("cf-cache-status") ?? "none",
    path,
    status: response.status,
    totalMs: performance.now() - start,
    ttfbMs,
  };
}

async function samplePaths(baseUrl: string, paths: readonly string[]) {
  const samples: Sample[] = [];
  for (const path of paths) samples.push(await sample(baseUrl, path));

  return samples;
}

async function benchmark(baseUrl: string, runId: string) {
  const result: Record<string, ReturnType<typeof summarize>> = {};

  for (const route of WARM_ROUTES) {
    await sample(baseUrl, route);
    const paths = Array.from({ length: WARM_REQUESTS }, () => route);
    result[`warm:${route}`] = summarize(await samplePaths(baseUrl, paths));
  }

  const referenceIds = parseIds("REFERENCE_POST_IDS", REFERENCE_POST_IDS);
  const recentIds = parseIds("RECENT_POST_IDS", RECENT_POST_IDS);
  result["cold:reference-posts"] = summarize(
    await samplePaths(
      baseUrl,
      referenceIds.map((id, index) => withProbe(`/post/${id}`, runId, index)),
    ),
  );
  result["cold:recent-posts"] = summarize(
    await samplePaths(
      baseUrl,
      recentIds.map((id, index) =>
        withProbe(`/post/${id}`, runId, index + referenceIds.length),
      ),
    ),
  );

  return result;
}

async function run() {
  const runId = `${Date.now()}-${crypto.randomUUID()}`;
  const results: Record<string, Awaited<ReturnType<typeof benchmark>>> = {};

  for (const baseUrl of parseUrls()) {
    results[baseUrl] = await benchmark(baseUrl, runId);
  }

  console.log(
    JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        results,
      },
      null,
      2,
    ),
  );
}

if (import.meta.main) await run();
