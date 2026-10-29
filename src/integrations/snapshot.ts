import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { AstroIntegration } from "astro";
import { RequestBudget } from "../lib/hacker-news/budget";
import { createHackerNewsClient } from "../lib/hacker-news/official";
import { buildSnapshot, parseSnapshot, parseSnapshotLimit, type Snapshot } from "../lib/snapshot";

export default function hackerNewsSnapshot(): AstroIntegration {
  let root: URL;
  let snapshot: Snapshot;
  const prepare = async () => {
    const limit = parseSnapshotLimit(process.env.HN_SNAPSHOT_LIMIT ?? process.env.HN_SEARCH_LIMIT);
    snapshot = process.env.HN_SNAPSHOT_FILE
      ? parseSnapshot(JSON.parse(await readFile(process.env.HN_SNAPSHOT_FILE, "utf8")))
      : await buildSnapshot(createHackerNewsClient({ budget: new RequestBudget(2 * (4 + limit * 4)) }), limit);
    await mkdir(new URL(".astro/", root), { recursive: true });
    await writeFile(new URL(".astro/hn-snapshot.json", root), JSON.stringify(snapshot));
  };
  return {
    name: "hacker-news-snapshot",
    hooks: {
      "astro:config:done": ({ config }) => { root = config.root; },
      "astro:build:start": prepare,
      "astro:server:setup": prepare,
      "astro:build:done": async ({ dir, logger }) => {
        // Runs after astro-pagefind: indexing failures must prevent deployment.
        await readFile(new URL("pagefind/pagefind.js", dir));
        const entry = JSON.parse(await readFile(new URL("pagefind/pagefind-entry.json", dir), "utf8"));
        if (entry.languages?.en?.page_count !== snapshot.stories.length) throw new Error("Pagefind did not index every prerendered story");
        await writeFile(new URL("pagefind/snapshot.json", dir), JSON.stringify({
          builtAt: snapshot.builtAt, count: snapshot.stories.length, limitPerFeed: snapshot.limitPerFeed,
        }));
        logger.info(`Static snapshot: ${snapshot.stories.length} stories`);
      },
    },
  };
}
