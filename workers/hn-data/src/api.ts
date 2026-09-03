import {
  parseNumberArray,
  parseOfficialItem,
  parseOfficialUser,
  type OfficialItem,
  type OfficialUser,
} from "~/lib/hacker-news/codec";

const API_ORIGIN = "https://hacker-news.firebaseio.com/v0";
const REQUEST_TIMEOUT_MS = 3_000;
const HTTP_OK = 200;

interface CloudflareRequestInit extends RequestInit {
  readonly cf?: {
    readonly cacheEverything: boolean;
    readonly cacheTtl: number;
  };
}

interface UpdatePayload {
  readonly items: readonly number[];
  readonly profiles: readonly string[];
}

function isUpdatePayload(value: unknown): value is UpdatePayload {
  if (typeof value !== "object" || value === null) return false;

  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record.items) &&
    record.items.every((item) => typeof item === "number") &&
    Array.isArray(record.profiles) &&
    record.profiles.every((item) => typeof item === "string")
  );
}

export class HnApi {
  async #get<T>(
    path: string,
    parse: (value: unknown) => T | null,
    cacheTtl: number,
  ) {
    const init: CloudflareRequestInit = {
      cf: { cacheEverything: true, cacheTtl },
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    };
    const response = await fetch(`${API_ORIGIN}${path}`, init);
    if (response.status !== HTTP_OK) return null;

    return parse(await response.json());
  }

  getFeed(feedName: string) {
    return this.#get(`/${feedName}.json`, parseNumberArray, 30);
  }

  getItem(itemId: number): Promise<OfficialItem | null> {
    return this.#get(`/item/${itemId}.json`, parseOfficialItem, 15);
  }

  getUpdates(): Promise<UpdatePayload | null> {
    return this.#get(
      "/updates.json",
      (value) => (isUpdatePayload(value) ? value : null),
      15,
    );
  }

  getUser(userName: string): Promise<OfficialUser | null> {
    return this.#get(
      `/user/${encodeURIComponent(userName)}.json`,
      parseOfficialUser,
      300,
    );
  }
}
