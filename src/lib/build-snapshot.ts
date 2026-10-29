import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseSnapshot, type Snapshot } from "./snapshot";
let snapshot: Promise<Snapshot> | undefined;
/** Prepared once by the integration; never imported by browser scripts. */
export function getBuildSnapshot() {
  return snapshot ??= readFile(resolve(".astro/hn-snapshot.json"), "utf8")
    .then((source) => parseSnapshot(JSON.parse(source)));
}
