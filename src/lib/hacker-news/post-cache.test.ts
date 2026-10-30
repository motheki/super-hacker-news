import { describe, expect, test } from "bun:test";
import type { Post } from "~/lib/post";
import { SITE_URL } from "~/lib/site";
import {
  withPostCache,
  type PostCache,
  type PostCacheDependencies,
  type PostCacheMetric,
} from "./post-cache";
import { PostUnavailableError } from "./post-loader";

const POST_ID = 42;
const START = 1_700_000_000_000;
const HOUR = 3_600_000;
const KEY = new URL(`/__internal/hn-post-cache/${POST_ID}`, SITE_URL).href;
const CACHE_ERROR = new Error("private cache details https://secret.example/token");
type Operation = "read" | "write" | "delete";

function createPost(count = 1): Post {
  return {
    id: POST_ID,
    title: "Story",
    points: 10,
    user: "alice",
    time: START / 1_000,
    time_ago: "just now",
    comments: Array.from({ length: count }, (_, index) => ({
      id: POST_ID + index + 1,
      comments: [],
      comments_count: 0,
    })),
    comments_count: count,
  };
}

class FakeCache implements PostCache {
  readonly entries = new Map<string, Response>();
  readonly calls: { operation: Operation; key: string }[] = [];
  failure?: Operation;
  before?: (operation: Operation) => Promise<void>;

  private async start(operation: Operation, key: string) {
    this.calls.push({ operation, key });
    await this.before?.(operation);
    if (this.failure === operation) throw CACHE_ERROR;
  }

  async match(key: string) {
    await this.start("read", key);
    // Deliberately ignore HTTP TTL so tests prove the envelope's age check.
    return this.entries.get(key)?.clone();
  }

  async put(key: string, response: Response) {
    await this.start("write", key);
    this.entries.set(key, response.clone());
  }

  async delete(key: string) {
    await this.start("delete", key);
    return this.entries.delete(key);
  }
}

function setup() {
  const cache = new FakeCache();
  const metrics: PostCacheMetric[] = [];
  const opened: string[] = [];
  const clock = { time: START };
  const dependencies: PostCacheDependencies = {
    openCache: async (name) => {
      opened.push(name);
      return cache;
    },
    now: () => clock.time,
    report: (metric) => { metrics.push(metric); },
  };
  const error = new PostUnavailableError("provider failed", { cause: CACHE_ERROR });
  const fail = async (): Promise<Post | null> => { throw error; };
  const seed = (post = createPost(), loadedAt = START) => {
    cache.entries.set(KEY, Response.json({ loadedAt, post }));
  };
  return { cache, metrics, opened, clock, dependencies, error, fail, seed };
}

function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("withPostCache", () => {
  test("writes successful normalized data under the named cache and fixed site key", async () => {
    const state = setup();
    const post = createPost(2);
    expect(await withPostCache(POST_ID, async () => post, state.dependencies)).toBe(post);
    expect(state.opened).toEqual(["super-hn-posts-v1"]);
    expect(state.cache.calls).toEqual([{ operation: "write", key: KEY }]);
    const response = state.cache.entries.get(KEY)!;
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600");
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(await response.clone().json()).toEqual({ loadedAt: START, post });

    expect(post.stale).toBeUndefined();
    state.clock.time += 5_000;
    expect(await withPostCache(POST_ID, state.fail, state.dependencies)).toEqual({ ...post, stale: true });
    expect(state.metrics).toEqual([
      { event: "hn.post_cache", postId: POST_ID, outcome: "stale", ageMs: 5_000 },
    ]);
  });

  test("always tries the provider first and replaces an existing entry", async () => {
    const state = setup();
    state.seed();
    const fresh = createPost(3);
    expect(await withPostCache(POST_ID, async () => {
      expect(state.opened).toEqual([]);
      expect(state.cache.calls).toEqual([]);
      return fresh;
    }, state.dependencies)).toBe(fresh);
    expect(state.cache.calls.map(({ operation }) => operation)).toEqual(["write"]);
    expect(await withPostCache(POST_ID, state.fail, state.dependencies)).toEqual({ ...fresh, stale: true });
  });

  test.each([true, false])("does not persist a provider stale flag of %s", async (stale) => {
    const state = setup();
    const post = { ...createPost(), stale };
    expect(await withPostCache(POST_ID, async () => post, state.dependencies)).toBe(post);
    expect(await state.cache.entries.get(KEY)!.clone().json()).toEqual({
      loadedAt: START,
      post: createPost(),
    });
    expect(await withPostCache(POST_ID, state.fail, state.dependencies)).toEqual({
      ...createPost(), stale: true,
    });
  });

  test("fallback overrides a serialized false stale flag without rewriting the entry", async () => {
    const state = setup();
    state.seed({ ...createPost(), stale: false });
    const original = await state.cache.entries.get(KEY)!.clone().text();
    expect(await withPostCache(POST_ID, state.fail, state.dependencies)).toEqual({
      ...createPost(), stale: true,
    });
    expect(await state.cache.entries.get(KEY)!.clone().text()).toBe(original);
    expect(state.cache.calls).toEqual([{ operation: "read", key: KEY }]);
  });

  test("does not read cache until the failed provider has settled", async () => {
    const state = setup();
    state.seed();
    const pending = deferred();
    const result = withPostCache(POST_ID, async () => {
      await pending.promise;
      throw state.error;
    }, state.dependencies);
    expect(state.opened).toEqual([]);
    pending.resolve();
    expect(await result).toEqual({ ...createPost(), stale: true });
  });

  test("rethrows the same provider error on a missing entry", async () => {
    const state = setup();
    await expect(withPostCache(POST_ID, state.fail, state.dependencies)).rejects.toBe(state.error);
    expect(state.cache.calls).toEqual([{ operation: "read", key: KEY }]);
    expect(state.cache.entries.size).toBe(0);
  });

  test.each(["missing", "deleted"])("authoritative %s null evicts without fallback", async () => {
    const state = setup();
    state.seed();
    expect(await withPostCache(POST_ID, async () => null, state.dependencies)).toBeNull();
    expect(state.cache.entries.size).toBe(0);
    expect(state.cache.calls).toEqual([{ operation: "delete", key: KEY }]);
    await expect(withPostCache(POST_ID, state.fail, state.dependencies)).rejects.toBe(state.error);
  });

  test("null with no prior entry remains null and is never stored", async () => {
    const state = setup();
    expect(await withPostCache(POST_ID, async () => null, state.dependencies)).toBeNull();
    expect(state.cache.entries.size).toBe(0);
    expect(state.cache.calls).toEqual([{ operation: "delete", key: KEY }]);
  });

  test("authoritative zero replaces a nonempty post", async () => {
    const state = setup();
    state.seed(createPost(5));
    const zero = createPost(0);
    expect(await withPostCache(POST_ID, async () => zero, state.dependencies)).toBe(zero);
    expect(zero.stale).toBeUndefined();
    expect(await state.cache.entries.get(KEY)!.clone().json()).toEqual({ loadedAt: START, post: zero });
    expect(await withPostCache(POST_ID, state.fail, state.dependencies)).toEqual({ ...zero, stale: true });
    const fresh = createPost(2);
    expect(await withPostCache(POST_ID, async () => fresh, state.dependencies)).toBe(fresh);
    expect(fresh.stale).toBeUndefined();
    expect(await withPostCache(POST_ID, state.fail, state.dependencies)).toEqual({ ...fresh, stale: true });
  });

  test.each([HOUR, HOUR + 1, -1])("rejects an entry with age %i ms", async (age) => {
    const state = setup();
    state.seed();
    state.clock.time += age;
    await expect(withPostCache(POST_ID, state.fail, state.dependencies)).rejects.toBe(state.error);
    expect(state.metrics).toEqual([]);
  });

  test.each([0, 1])("fallback with %i comments never re-puts or refreshes the success timestamp", async (count) => {
    const state = setup();
    const post = createPost(count);
    await withPostCache(POST_ID, async () => post, state.dependencies);
    const original = await state.cache.entries.get(KEY)!.clone().text();
    for (const age of [1, HOUR / 2, HOUR - 1]) {
      state.clock.time = START + age;
      expect(await withPostCache(POST_ID, state.fail, state.dependencies)).toEqual({ ...post, stale: true });
      expect(await state.cache.entries.get(KEY)!.clone().text()).toBe(original);
    }
    state.clock.time = START + HOUR;
    await expect(withPostCache(POST_ID, state.fail, state.dependencies)).rejects.toBe(state.error);
    expect(state.cache.calls.filter(({ operation }) => operation === "write")).toHaveLength(1);
  });

  test.each([
    ["invalid JSON", "{"],
    ["null envelope", "null"],
    ["missing timestamp", JSON.stringify({ post: createPost() })],
    ["string timestamp", JSON.stringify({ loadedAt: String(START), post: createPost() })],
    ["infinite timestamp", `{"loadedAt":1e400,"post":${JSON.stringify(createPost())}}`],
    ["negative timestamp", JSON.stringify({ loadedAt: -1, post: createPost() })],
    ["invalid post", JSON.stringify({ loadedAt: START, post: { id: POST_ID } })],
    ["invalid comment", JSON.stringify({ loadedAt: START, post: { ...createPost(), comments: [null] } })],
    ["mismatched id", JSON.stringify({ loadedAt: START, post: { ...createPost(), id: 99 } })],
    ["mismatched id marked stale", JSON.stringify({ loadedAt: START, post: { ...createPost(), id: 99, stale: true } })],
  ])("rejects %s without masking the provider error", async (_name, body) => {
    const state = setup();
    state.cache.entries.set(KEY, new Response(body));
    await expect(withPostCache(POST_ID, state.fail, state.dependencies)).rejects.toBe(state.error);
    expect(state.cache.calls).toEqual([{ operation: "read", key: KEY }]);
  });

  test("rejects non-success cached responses", async () => {
    const state = setup();
    state.cache.entries.set(KEY, Response.json({ loadedAt: START, post: createPost() }, { status: 500 }));
    await expect(withPostCache(POST_ID, state.fail, state.dependencies)).rejects.toBe(state.error);
  });

  test("normalizes restored comment counts rather than trusting serialized counts", async () => {
    const state = setup();
    state.seed({ ...createPost(2), comments_count: 999 });
    expect(await withPostCache(POST_ID, state.fail, state.dependencies)).toEqual({ ...createPost(2), stale: true });
  });

  test("does not store mismatched successful data", async () => {
    const state = setup();
    const post = { ...createPost(), id: 99 };
    expect(await withPostCache(POST_ID, async () => post, state.dependencies)).toBe(post);
    expect(state.cache.entries.size).toBe(0);
    await expect(withPostCache(POST_ID, state.fail, state.dependencies)).rejects.toBe(state.error);
  });

  test.each(["read", "write", "delete"] as const)("isolates %s outages and logs only safe fields", async (operation) => {
    const state = setup();
    state.seed();
    state.cache.failure = operation;
    const post = createPost();
    if (operation === "read") {
      await expect(withPostCache(POST_ID, state.fail, state.dependencies)).rejects.toBe(state.error);
    } else {
      const value = operation === "write" ? post : null;
      expect(await withPostCache(POST_ID, async () => value, state.dependencies)).toBe(value);
    }
    expect(state.metrics).toEqual([
      { event: "hn.post_cache", postId: POST_ID, outcome: "cache-failure", operation },
    ]);
    expect(JSON.stringify(state.metrics)).not.toContain("private");
  });

  test("open outages preserve success, null, and the original provider error", async () => {
    const state = setup();
    const dependencies: PostCacheDependencies = {
      ...state.dependencies,
      openCache: async () => { throw CACHE_ERROR; },
    };
    const post = createPost();
    expect(await withPostCache(POST_ID, async () => post, dependencies)).toBe(post);
    expect(await withPostCache(POST_ID, async () => null, dependencies)).toBeNull();
    await expect(withPostCache(POST_ID, state.fail, dependencies)).rejects.toBe(state.error);
    expect(state.metrics).toEqual(Array.from({ length: 3 }, () => ({
      event: "hn.post_cache", postId: POST_ID, outcome: "cache-failure", operation: "open",
    })));
  });

  test.each([new TypeError("bug"), new Error("PostUnavailableError"), "failure"])(
    "rethrows non-provider failures without any cache access: %s", async (error) => {
      const state = setup();
      state.seed();
      await expect(withPostCache(POST_ID, async () => { throw error; }, state.dependencies)).rejects.toBe(error);
      expect(state.opened).toEqual([]);
      expect(state.cache.calls).toEqual([]);
    },
  );

  test("throwing telemetry cannot mask fallback, success, or provider errors", async () => {
    const state = setup();
    state.seed();
    const dependencies = { ...state.dependencies, report: () => { throw CACHE_ERROR; } };
    expect(await withPostCache(POST_ID, state.fail, dependencies)).toEqual({ ...createPost(), stale: true });
    state.cache.failure = "read";
    await expect(withPostCache(POST_ID, state.fail, dependencies)).rejects.toBe(state.error);
    state.cache.failure = "write";
    const post = createPost();
    expect(await withPostCache(POST_ID, async () => post, dependencies)).toBe(post);
  });

  test("timestamps load completion and deducts time spent opening the cache", async () => {
    const state = setup();
    const dependencies = {
      ...state.dependencies,
      openCache: async () => {
        state.clock.time += 10_000;
        return state.cache;
      },
    };
    await withPostCache(POST_ID, async () => {
      state.clock.time += 30_000;
      return createPost();
    }, dependencies);
    const response = state.cache.entries.get(KEY)!;
    expect(await response.clone().json()).toEqual({ loadedAt: START + 30_000, post: createPost() });
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3590");
  });

  test("checks expiration after cache I/O", async () => {
    const state = setup();
    state.seed();
    state.cache.before = async () => { state.clock.time += HOUR; };
    await expect(withPostCache(POST_ID, state.fail, state.dependencies)).rejects.toBe(state.error);
  });

  test.each(["read", "write", "delete"] as const)("awaits %s I/O before settling", async (operation) => {
    const state = setup();
    state.seed();
    const entered = deferred();
    const release = deferred();
    state.cache.before = async () => {
      entered.resolve();
      await release.promise;
    };
    const load = operation === "read" ? state.fail : async () => operation === "delete" ? null : createPost();
    let settled = false;
    const result = withPostCache(POST_ID, load, state.dependencies).then((value) => {
      settled = true;
      return value;
    });
    await entered.promise;
    expect(settled).toBe(false);
    release.resolve();
    expect(await result).toEqual(
      operation === "delete" ? null : operation === "read" ? { ...createPost(), stale: true } : createPost(),
    );
    expect(settled).toBe(true);
  });

  test.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("rejects invalid numeric id %s", async (id) => {
    const state = setup();
    let loads = 0;
    await expect(withPostCache(id, async () => { loads += 1; return null; }, state.dependencies)).rejects.toBeInstanceOf(RangeError);
    expect(loads).toBe(0);
    expect(state.opened).toEqual([]);
  });

  test("works with the default runtime dependency when Bun has no caches global", async () => {
    expect(typeof caches).toBe("undefined");
    const state = setup();
    const post = createPost();
    expect(await withPostCache(POST_ID, async () => post)).toBe(post);
    expect(await withPostCache(POST_ID, async () => null)).toBeNull();
    await expect(withPostCache(POST_ID, state.fail)).rejects.toBe(state.error);
  });
});
