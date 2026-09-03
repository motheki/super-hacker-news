import { HnDataService } from "./service";
import type { HnDataEnv, HydrationMessage } from "./types";

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_SERVICE_UNAVAILABLE = 503;
const HTTP_SERVER_ERROR = 500;
const RETRY_SECONDS = 5;

function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "cache-control": "private, no-store" },
  });
}

function parseId(value: string) {
  if (!/^[1-9]\d*$/u.test(value)) return null;

  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function parsePage(url: URL) {
  const value = url.searchParams.get("page") ?? "1";
  return parseId(value);
}

async function route(request: Request, env: HnDataEnv) {
  if (request.method !== "GET") return new Response(null, { status: 405 });

  const url = new URL(request.url);
  const service = new HnDataService(env);
  if (url.pathname === "/health") return json({ status: "ok" });
  if (url.pathname === "/best") {
    const ids = await service.getBestIds();
    return ids === null ? json(null, HTTP_SERVICE_UNAVAILABLE) : json(ids);
  }

  const feed = url.pathname.match(/^\/feed\/([^/]+)$/u);
  if (feed !== null) {
    const topic = feed[1];
    const page = parsePage(url);
    if (topic === undefined || page === null) {
      return json(null, HTTP_BAD_REQUEST);
    }

    const items = await service.getFeed(topic, page);
    return items === null ? json(null, HTTP_SERVICE_UNAVAILABLE) : json(items);
  }

  const post = url.pathname.match(/^\/post\/(\d+)$/u);
  if (post !== null) {
    const postId = parseId(post[1] ?? "");
    if (postId === null) return json(null, HTTP_BAD_REQUEST);

    const value = await service.getPost(postId);
    return value === null ? json(null, HTTP_SERVICE_UNAVAILABLE) : json(value);
  }

  const resolution = url.pathname.match(/^\/resolve\/(\d+)$/u);
  if (resolution !== null) {
    const itemId = parseId(resolution[1] ?? "");
    if (itemId === null) return json(null, HTTP_BAD_REQUEST);

    const value = await service.getResolution(itemId);
    return value === null ? json(null, HTTP_NOT_FOUND) : json(value);
  }

  const user = url.pathname.match(/^\/user\/([^/]+)$/u);
  if (user !== null) {
    const userName = user[1];
    if (userName === undefined || userName.length === 0) {
      return json(null, HTTP_BAD_REQUEST);
    }

    const value = await service.getUser(decodeURIComponent(userName));
    return value === null ? json(null, HTTP_NOT_FOUND) : json(value);
  }

  return json(null, HTTP_NOT_FOUND);
}

export default {
  async fetch(request: Request, env: HnDataEnv) {
    try {
      return await route(request, env);
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "hn.request_error",
          message: error instanceof Error ? error.message : String(error),
        }),
      );
      return json(null, HTTP_SERVER_ERROR);
    }
  },

  async queue(batch: MessageBatch<HydrationMessage>, env: HnDataEnv) {
    const service = new HnDataService(env);
    for (const message of batch.messages) {
      try {
        await service.handle(message.body);
        message.ack();
      } catch (error) {
        console.error(
          JSON.stringify({
            event: "hn.queue_error",
            message: error instanceof Error ? error.message : String(error),
            messageId: message.id,
          }),
        );
        message.retry({ delaySeconds: RETRY_SECONDS });
      }
    }
  },

  async scheduled(_controller: ScheduledController, env: HnDataEnv) {
    await new HnDataService(env).sync();
  },
} satisfies ExportedHandler<HnDataEnv, HydrationMessage>;
