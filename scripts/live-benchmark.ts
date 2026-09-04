import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib";

const SUPER_HN_URL = "https://superhn.org";
const BETTER_HN_URL = "https://bhn.vercel.app";
const HN_BEST_STORIES_URL =
  "https://hacker-news.firebaseio.com/v0/beststories.json";
const WARM_REQUESTS = 30;
const REQUIRED_POSTS = 10;
const MAX_REDIRECTS = 8;
const WARM_ROUTES = ["/top", "/post/8863"] as const;
const REFERENCE_POST_IDS = [
  49_543_220, 49_554_643, 49_544_618, 49_550_698, 49_550_772, 49_551_096,
  49_554_520, 49_552_572, 49_548_395, 49_526_453,
] as const;
const RECENT_POST_IDS = [
  49_557_206, 49_548_452, 49_548_600, 49_558_433, 49_555_592, 49_559_330,
  49_559_320, 49_559_069, 49_558_610, 49_559_314,
] as const;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const CACHE_HITS = new Set(["HIT", "REVALIDATED"]);

interface BenchmarkRequestInit extends RequestInit {
  readonly decompress?: boolean;
}

type Fetcher = (
  input: string | URL | Request,
  init?: BenchmarkRequestInit,
) => Promise<Response>;

interface CacheState {
  readonly provider: "cloudflare" | "none" | "vercel";
  readonly status: string;
}

interface Sample {
  readonly cache: CacheState;
  readonly contentEncoding: string;
  readonly decodedBytes: number;
  readonly encodedBytes: number | null;
  readonly finalUrl: string;
  readonly path: string;
  readonly redirects: number;
  readonly serverTiming: Readonly<Record<string, number>>;
  readonly status: number;
  readonly totalMs: number;
  readonly ttfbMs: number;
}

interface PostIds {
  readonly recent: readonly number[];
  readonly reference: readonly number[];
}

function parseUrls() {
  const configured = process.env.BENCHMARK_URLS;
  const urls = configured?.split(",").map((url) => url.trim()) ?? [
    SUPER_HN_URL,
    BETTER_HN_URL,
  ];

  return urls.filter((url) => url.length > 0);
}

function parseIds(
  name: string,
  defaults: readonly number[],
  excluded: ReadonlySet<number> = new Set(),
) {
  const value = process.env[name];
  const source = value === undefined ? defaults : value.split(",");

  const ids = source
    .map((item) => Number(item))
    .filter(
      (item) => Number.isSafeInteger(item) && item > 0 && !excluded.has(item),
    );
  if (ids.length < REQUIRED_POSTS) {
    throw new Error(`${name} requires at least ${REQUIRED_POSTS} IDs`);
  }

  return ids.slice(0, REQUIRED_POSTS);
}

export function selectPostIds(
  value: unknown,
  excluded: ReadonlySet<number> = new Set(),
) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is number =>
        typeof item === "number" &&
        Number.isSafeInteger(item) &&
        item > 0 &&
        !excluded.has(item),
    )
    .slice(0, REQUIRED_POSTS);
}

async function loadRecentIds(excluded: ReadonlySet<number>) {
  if (process.env.RECENT_POST_IDS !== undefined) {
    return parseIds("RECENT_POST_IDS", RECENT_POST_IDS, excluded);
  }

  try {
    const response = await fetch(HN_BEST_STORIES_URL);
    if (!response.ok) throw new Error(`HN returned ${response.status}`);

    const ids = selectPostIds(await response.json(), excluded);
    if (ids.length < REQUIRED_POSTS) {
      throw new Error("HN returned too few best-story IDs");
    }

    return ids;
  } catch (error) {
    console.warn(
      `Unable to refresh recent IDs: ${error instanceof Error ? error.message : String(error)}`,
    );
    return parseIds("RECENT_POST_IDS", RECENT_POST_IDS, excluded);
  }
}

export function percentile(values: readonly number[], fraction: number) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil(sorted.length * fraction) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

export function cacheState(headers: Headers): CacheState {
  const cloudflare = headers.get("cf-cache-status");
  if (cloudflare !== null) {
    return { provider: "cloudflare", status: cloudflare.toUpperCase() };
  }

  const vercel = headers.get("x-vercel-cache");
  if (vercel !== null) {
    return { provider: "vercel", status: vercel.toUpperCase() };
  }

  return { provider: "none", status: "NONE" };
}

export function parseServerTiming(value: string | null) {
  if (value === null) return {};

  const timings: Record<string, number> = {};
  for (const entry of value.split(",")) {
    const [rawName, ...parameters] = entry.split(";");
    const name = rawName?.trim();
    if (name === undefined || name.length === 0) continue;

    const duration = parameters
      .map((parameter) => parameter.trim())
      .find((parameter) => parameter.startsWith("dur="));
    if (duration === undefined) continue;

    const parsed = Number(duration.slice("dur=".length));
    if (Number.isFinite(parsed) && parsed >= 0) timings[name] = parsed;
  }

  return timings;
}

export async function followRedirects(
  url: string | URL,
  fetcher: Fetcher = fetch,
) {
  let current = new URL(url);

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const response = await fetcher(current, {
      decompress: false,
      headers: { "accept-encoding": "gzip, br, zstd" },
      redirect: "manual",
    });
    const location = response.headers.get("location");
    if (!REDIRECT_STATUSES.has(response.status) || location === null) {
      return { finalUrl: current.href, redirects, response };
    }
    if (redirects === MAX_REDIRECTS) {
      throw new Error(`Benchmark exceeded ${MAX_REDIRECTS} redirects`);
    }

    current = new URL(location, current);
  }

  throw new Error("Benchmark redirect loop was not resolved");
}

export function decodedLength(
  bytes: Uint8Array<ArrayBuffer>,
  encoding: string,
) {
  if (encoding === "br") return brotliDecompressSync(bytes).byteLength;
  if (encoding === "deflate") return inflateSync(bytes).byteLength;
  if (encoding === "gzip") return gunzipSync(bytes).byteLength;
  if (encoding === "zstd") return Bun.zstdDecompressSync(bytes).byteLength;
  if (encoding === "identity") return bytes.byteLength;

  throw new Error(`Unsupported content encoding: ${encoding}`);
}

function roundedPercentile(values: readonly number[], fraction: number) {
  return Math.round(percentile(values, fraction) * 10) / 10;
}

function timingSummary(samples: readonly Sample[]) {
  const names = new Set(
    samples.flatMap(({ serverTiming }) => Object.keys(serverTiming)),
  );

  return Object.fromEntries(
    [...names].map((name) => {
      const values = samples.flatMap(({ serverTiming }) => {
        const value = serverTiming[name];
        return value === undefined ? [] : [value];
      });

      return [
        name,
        {
          count: values.length,
          p50Ms: roundedPercentile(values, 0.5),
          p95Ms: roundedPercentile(values, 0.95),
        },
      ];
    }),
  );
}

function summarize(samples: readonly Sample[]) {
  const totals = samples.map(({ totalMs }) => totalMs);
  const ttfbs = samples.map(({ ttfbMs }) => ttfbMs);
  const encoded = samples.flatMap(({ encodedBytes }) =>
    encodedBytes === null ? [] : [encodedBytes],
  );
  const cache = Object.groupBy(
    samples,
    ({ cache: state }) => `${state.provider}:${state.status}`,
  );
  const statuses = Object.groupBy(samples, ({ status }) => String(status));
  const finalHosts = Object.groupBy(
    samples,
    ({ finalUrl }) => new URL(finalUrl).host,
  );
  const finalUrls = Object.groupBy(samples, ({ finalUrl }) => finalUrl);

  return {
    cache: Object.fromEntries(
      Object.entries(cache).map(([status, entries]) => [
        status,
        entries?.length ?? 0,
      ]),
    ),
    contentEncoding: [
      ...new Set(samples.map(({ contentEncoding }) => contentEncoding)),
    ],
    count: samples.length,
    decodedBytesMedian: Math.round(
      percentile(
        samples.map(({ decodedBytes }) => decodedBytes),
        0.5,
      ),
    ),
    encodedBytesMedian:
      encoded.length === 0 ? null : Math.round(percentile(encoded, 0.5)),
    finalHosts: Object.fromEntries(
      Object.entries(finalHosts).map(([host, entries]) => [
        host,
        entries?.length ?? 0,
      ]),
    ),
    finalUrls: Object.fromEntries(
      Object.entries(finalUrls).map(([url, entries]) => [
        url,
        entries?.length ?? 0,
      ]),
    ),
    redirects: samples.reduce((total, sample) => total + sample.redirects, 0),
    serverTiming: timingSummary(samples),
    statuses: Object.fromEntries(
      Object.entries(statuses).map(([status, entries]) => [
        status,
        entries?.length ?? 0,
      ]),
    ),
    totalP50Ms: roundedPercentile(totals, 0.5),
    totalP95Ms: roundedPercentile(totals, 0.95),
    ttfbP50Ms: roundedPercentile(ttfbs, 0.5),
    ttfbP95Ms: roundedPercentile(ttfbs, 0.95),
  };
}

function isCacheHit(sample: Sample) {
  return CACHE_HITS.has(sample.cache.status);
}

async function sample(baseUrl: string, path: string): Promise<Sample> {
  const start = performance.now();
  const result = await followRedirects(`${baseUrl}${path}`);
  const ttfbMs = performance.now() - start;
  const body = new Uint8Array(await result.response.arrayBuffer());
  const contentEncoding =
    result.response.headers.get("content-encoding") ?? "identity";

  return {
    cache: cacheState(result.response.headers),
    contentEncoding,
    decodedBytes: decodedLength(body, contentEncoding),
    encodedBytes: body.byteLength,
    finalUrl: result.finalUrl,
    path,
    redirects: result.redirects,
    serverTiming: parseServerTiming(
      result.response.headers.get("server-timing"),
    ),
    status: result.response.status,
    totalMs: performance.now() - start,
    ttfbMs,
  };
}

async function samplePaths(baseUrl: string, paths: readonly string[]) {
  const samples: Sample[] = [];
  for (const path of paths) samples.push(await sample(baseUrl, path));

  return samples;
}

async function benchmark(baseUrl: string, postIds: PostIds) {
  const scenarios: Record<string, ReturnType<typeof summarize>> = {};

  for (const route of WARM_ROUTES) {
    scenarios[`fill:${route}`] = summarize([await sample(baseUrl, route)]);

    const paths = Array.from({ length: WARM_REQUESTS }, () => route);
    const repeated = await samplePaths(baseUrl, paths);
    scenarios[`repeat:${route}`] = summarize(repeated);
    scenarios[`hit:${route}`] = summarize(repeated.filter(isCacheHit));
  }

  scenarios["probe:reference-posts"] = summarize(
    await samplePaths(
      baseUrl,
      postIds.reference.map((id) => `/post/${id}`),
    ),
  );
  scenarios["probe:recent-posts"] = summarize(
    await samplePaths(
      baseUrl,
      postIds.recent.map((id) => `/post/${id}`),
    ),
  );

  return {
    postIds,
    scenarios,
  };
}

async function run() {
  const results: Record<string, Awaited<ReturnType<typeof benchmark>>> = {};
  const reference = parseIds("REFERENCE_POST_IDS", REFERENCE_POST_IDS);
  const postIds = {
    recent: await loadRecentIds(new Set(reference)),
    reference,
  };

  for (const baseUrl of parseUrls()) {
    results[baseUrl] = await benchmark(baseUrl, postIds);
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
