import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fixtureClient, STORY } from "./fixtures/hacker-news";
import { fixtureData } from "./fixtures/static-site";
import { buildSnapshot } from "../src/lib/snapshot";
const file = resolve("__tests_/.artifacts/snapshot.json");
await mkdir(resolve("__tests_/.artifacts"), { recursive: true });
const snapshot = await buildSnapshot(fixtureClient(fixtureData, 1000).client, 100, STORY.time! * 1000 + 1000);
await writeFile(file, JSON.stringify(snapshot));
const result = spawnSync("node", ["node_modules/astro/bin/astro.mjs", "build", "--outDir", "__tests_/.artifacts/site"], {
  stdio: "inherit", env: { ...process.env, HN_SNAPSHOT_FILE: file },
});
process.exit(result.status ?? 1);
