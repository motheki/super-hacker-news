const DEFAULT_BASE_URL = "https://superhn.org";
const WARM_REQUESTS = 30;
const REQUIRED_COLD_REQUESTS = 10;
const WARM_ROUTES = ["/top", "/post/8863"] as const;

interface Sample {
  readonly bytes: number;
  readonly cache: string;
  readonly path: string;
  readonly status: number;
  readonly totalMs: number;
  readonly ttfbMs: number;
}

function parseIds(name: string) {
  const value = process.env[name] ?? "";
  const ids = value
    .split(",")
    .map((item) => Number(item))
    .filter((item) => Number.isSafeInteger(item) && item > 0);
  if (ids.length < REQUIRED_COLD_REQUESTS) {
    throw new Error(`${name} requires at least ${REQUIRED_COLD_REQUESTS} IDs`);
  }

  return ids.slice(0, REQUIRED_COLD_REQUESTS);
}

function percentile(values: readonly number[], fraction: number) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil(sorted.length * fraction) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

function summarize(samples: readonly Sample[]) {
  const totals = samples.map(({ totalMs }) => totalMs);
  const ttfbs = samples.map(({ ttfbMs }) => ttfbMs);

  return {
    bytesMedian: Math.round(
      percentile(
        samples.map(({ bytes }) => bytes),
        0.5,
      ),
    ),
    count: samples.length,
    status5xx: samples.filter(({ status }) => status >= 500).length,
    totalP50Ms: Math.round(percentile(totals, 0.5) * 10) / 10,
    totalP95Ms: Math.round(percentile(totals, 0.95) * 10) / 10,
    ttfbP50Ms: Math.round(percentile(ttfbs, 0.5) * 10) / 10,
    ttfbP95Ms: Math.round(percentile(ttfbs, 0.95) * 10) / 10,
  };
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

async function run() {
  const baseUrl = process.env.BENCHMARK_BASE_URL ?? DEFAULT_BASE_URL;
  const materializedIds = parseIds("MATERIALIZED_IDS");
  const fallbackIds = parseIds("FALLBACK_IDS");
  const result: Record<string, ReturnType<typeof summarize>> = {};

  for (const route of WARM_ROUTES) {
    await sample(baseUrl, route);
    const paths = Array.from({ length: WARM_REQUESTS }, () => route);
    result[`warm:${route}`] = summarize(await samplePaths(baseUrl, paths));
  }

  result.materialized = summarize(
    await samplePaths(
      baseUrl,
      materializedIds.map((id) => `/post/${id}`),
    ),
  );
  result.fallback = summarize(
    await samplePaths(
      baseUrl,
      fallbackIds.map((id) => `/post/${id}`),
    ),
  );

  console.log(JSON.stringify({ baseUrl, result }, null, 2));
}

await run();
