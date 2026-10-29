import { createHackerNewsClient } from "../lib/hacker-news/official";
import { RequestBudget } from "../lib/hacker-news/budget";
import type { Fetcher } from "../lib/hacker-news/client";
// Share the connection gate across concurrent reply expansions, but never cache
// rejected promises or old story data across refresh actions.
let active = 0;
const queue: (() => void)[] = [];
const browserFetch: Fetcher = async (input, init) => {
  if (active >= 6) await new Promise<void>((resolve) => queue.push(resolve));
  else active++;
  try { return await fetch(input, init); }
  finally {
    const next = queue.shift();
    if (next) next(); else active--;
  }
};
export function browserClient() {
  return createHackerNewsClient({ fetcher: browserFetch, budget: new RequestBudget(64), report: () => {}, timeoutMs: 10000 });
}
