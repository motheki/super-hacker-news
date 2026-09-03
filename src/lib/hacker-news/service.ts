import type { Post } from "~/lib/post";
import type { TopicItem } from "~/lib/topic";
import type { User } from "~/lib/user";
import {
  parseAggregatedPost,
  parseAggregatedTopics,
  parseAggregatedUser,
  parseNumberArray,
} from "./codec";

const SERVICE_ORIGIN = "https://hn-data.internal";
const STALE_HEADER = "x-super-hn-stale";

export interface ServiceBinding {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export type ServiceTarget =
  | { readonly kind: "post"; readonly post: Post }
  | { readonly kind: "redirect"; readonly rootId: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseTarget(value: unknown): ServiceTarget | null {
  if (!isRecord(value) || typeof value.kind !== "string") return null;
  if (value.kind === "post") {
    const post = parseAggregatedPost(value.post);
    return post === null ? null : { kind: "post", post };
  }
  if (value.kind !== "redirect") return null;
  if (typeof value.rootId !== "number") return null;
  if (!Number.isSafeInteger(value.rootId) || value.rootId <= 0) return null;

  return { kind: "redirect", rootId: value.rootId };
}

export class HnDataClient {
  readonly #binding: ServiceBinding;

  constructor(binding: ServiceBinding) {
    this.#binding = binding;
  }

  async #get<T>(
    path: string,
    parse: (value: unknown) => T | null,
    isCurrent: (response: Response) => boolean = () => true,
  ) {
    const start = performance.now();
    try {
      const response = await this.#binding.fetch(`${SERVICE_ORIGIN}${path}`, {
        headers: { accept: "application/json" },
      });
      if (!response.ok) {
        console.info(
          JSON.stringify({
            event: "hn.service_miss",
            durationMs: Math.round((performance.now() - start) * 10) / 10,
            operation: path.split("/")[1] ?? "unknown",
            status: response.status,
          }),
        );
        return null;
      }
      if (!isCurrent(response)) {
        console.info(
          JSON.stringify({
            event: "hn.service_stale",
            durationMs: Math.round((performance.now() - start) * 10) / 10,
            operation: path.split("/")[1] ?? "unknown",
          }),
        );
        return null;
      }

      return parse(await response.json());
    } catch (error) {
      console.warn(
        JSON.stringify({
          event: "hn.service_fallback",
          durationMs: Math.round((performance.now() - start) * 10) / 10,
          message: error instanceof Error ? error.message : String(error),
          operation: path.split("/")[1] ?? "unknown",
        }),
      );
      return null;
    }
  }

  getBestStoryIds() {
    return this.#get("/best", parseNumberArray);
  }

  getTarget(itemId: number): Promise<ServiceTarget | null> {
    return this.#get(
      `/target/${itemId}`,
      parseTarget,
      (response) => response.headers.get(STALE_HEADER) !== "1",
    );
  }

  getTopics(topic: string, page: number): Promise<TopicItem[] | null> {
    const query = new URLSearchParams({ page: String(page) });
    return this.#get(
      `/feed/${encodeURIComponent(topic)}?${query.toString()}`,
      parseAggregatedTopics,
    );
  }

  getUser(userName: string): Promise<User | null> {
    return this.#get(
      `/user/${encodeURIComponent(userName)}`,
      parseAggregatedUser,
    );
  }
}
