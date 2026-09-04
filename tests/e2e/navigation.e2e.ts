import { expect, test } from "@playwright/test";
import { createServer } from "node:http";

const TOP_PATH = "/top";
const NEW_PATH = "/new";
const KNOWN_POST_PATH = "/post/8863";
const KNOWN_USER_PATH = "/user/pg";
const KNOWN_COMMENT_ID = 11_003;
const ACTIVE_POST_PATH = "/post/49522137";
const MIN_SCROLL_Y = 400;
const HTML_CACHE_CONTROL = "public, max-age=15";
const SITE_ORIGIN = "https://superhn.org";
const CSS_POINT_PX = 4 / 3;
const FONT_INCREASE_PX = 2 * CSS_POINT_PX;
const FONT_TOLERANCE_PX = 0.05;

function expectFontIncrease(actual: number, baseline: number) {
  expect(Math.abs(actual - baseline - FONT_INCREASE_PX)).toBeLessThan(
    FONT_TOLERANCE_PX,
  );
}

test("caches successful HTML briefly in the browser", async ({ page }) => {
  const response = await page.goto(TOP_PATH);

  expect(response?.headers()["cache-control"]).toBe(HTML_CACHE_CONTROL);
});

test("uses the canonical origin in metadata and discovery", async ({
  page,
  request,
}) => {
  await page.goto(TOP_PATH);

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${SITE_ORIGIN}${TOP_PATH}`,
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    `${SITE_ORIGIN}${TOP_PATH}`,
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    new RegExp(`^${SITE_ORIGIN}/`, "u"),
  );
  const structuredData = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  expect(JSON.parse(structuredData ?? "null") as unknown).toMatchObject({
    url: SITE_ORIGIN,
  });

  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`);
  expect(robots).toContain(`Host: ${SITE_ORIGIN}`);

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain(`<loc>${SITE_ORIGIN}/top</loc>`);
  expect(sitemap).not.toContain("workers.dev");
});

test("prefetches discussion links on intent", async ({ page }) => {
  await page.goto(TOP_PATH);

  await expect(page.locator('a[href^="/post/"]').last()).toHaveAttribute(
    "data-astro-prefetch",
    "hover",
  );
});

test("omits search and share controls", async ({ page }) => {
  await page.goto(TOP_PATH);

  await expect(
    page.getByRole("link", { name: "Search Hacker News" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Share page" })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Project source code" }),
  ).toBeAttached();
});

test("uses native navigation without custom scroll state", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(new RegExp(`${TOP_PATH}$`, "u"));
  await expect(page.getByRole("link", { name: "More..." })).toBeVisible();

  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight / 2);
  });
  const scrollY = await page.evaluate(() => window.scrollY);
  expect(scrollY).toBeGreaterThan(MIN_SCROLL_Y);

  await page.getByRole("link", { name: "New", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${NEW_PATH}$`, "u"));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${TOP_PATH}$`, "u"));
});

test("uses client-side view transitions for internal links", async ({
  page,
}) => {
  await page.goto(TOP_PATH);
  await page.evaluate(() => {
    Reflect.set(window, "__superHnTransitionProbe", true);
  });

  await page.getByRole("link", { name: "New", exact: true }).click();

  await expect(page).toHaveURL(new RegExp(`${NEW_PATH}$`, "u"));
  expect(
    await page.evaluate(() =>
      Boolean(Reflect.get(window, "__superHnTransitionProbe")),
    ),
  ).toBe(true);
  await expect(page).toHaveTitle("New | Super HN");
});

test("opens the second feed page without losing pagination", async ({
  page,
}) => {
  await page.goto(TOP_PATH);
  await page.getByRole("link", { name: "More..." }).click();

  await expect(page).toHaveURL(/\/top\/2$/u);
  await expect(page.locator(".feed-index").first()).toHaveText("31");
});

test("ships only the transition runtime", async ({ page }) => {
  const response = await page.goto(TOP_PATH);
  const html = await response?.text();
  const scripts = await page.locator("script[src]").count();

  expect(html?.length).toBeLessThan(80_000);
  expect(html).not.toContain("__next");
  expect(html).not.toContain("react");
  expect(scripts).toBeLessThanOrEqual(2);
});

test("uses the newspaper palettes and Alike", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(TOP_PATH);

  const light = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      background: style.backgroundColor,
      color: style.color,
      font: style.fontFamily,
    };
  });
  expect(light).toMatchObject({
    background: "rgb(217, 196, 168)",
    color: "rgb(33, 32, 32)",
  });
  expect(light.font).toContain("Alike");

  await page.emulateMedia({ colorScheme: "dark" });
  const dark = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      background: style.backgroundColor,
      color: style.color,
    };
  });
  expect(dark).toEqual({
    background: "rgb(15, 14, 15)",
    color: "rgb(195, 195, 196)",
  });
});

test("increases every text level by exactly two points", async ({ page }) => {
  await page.goto(TOP_PATH);
  const feedSizes = await page.evaluate(() => {
    const size = (selector: string) =>
      Number.parseFloat(
        getComputedStyle(document.querySelector(selector)!).fontSize,
      );
    const fixture = document.createElement("section");
    fixture.id = "font-fixture";
    fixture.innerHTML = `
      <nav class="nav-link">Navigation</nav>
      <p>Paragraph <a href="#">link</a></p>
      <div class="rich-text">Rich text</div>
      <div class="user-about">User information</div>
      <div class="message-page">Error message</div>
      <a class="skip-link" href="#content">Skip link</a>
      <pre>Preformatted text</pre>
    `;
    document.body.append(fixture);

    return {
      body: size("body"),
      domain: size("h2 .domain"),
      feedHeading: size("h2"),
      feedIndex: size(".feed-index"),
      inherited: [
        size("#font-fixture nav.nav-link"),
        size("#font-fixture p"),
        size("#font-fixture p a"),
        size("#font-fixture .rich-text"),
        size("#font-fixture .user-about"),
        size("#font-fixture .message-page"),
        size("#font-fixture .skip-link"),
        size("#font-fixture pre"),
      ],
      meta: size(".meta"),
    };
  });

  expectFontIncrease(feedSizes.body, 16);
  expectFontIncrease(feedSizes.feedHeading, 17.28);
  expectFontIncrease(feedSizes.feedIndex, 22.4);
  expectFontIncrease(feedSizes.meta, 13.12);
  expectFontIncrease(feedSizes.domain, 14.1696);
  for (const inheritedSize of feedSizes.inherited) {
    expectFontIncrease(inheritedSize, 16);
  }

  await page.goto(KNOWN_POST_PATH);
  const postSizes = await page.evaluate(() => {
    const size = (selector: string) =>
      Number.parseFloat(
        getComputedStyle(document.querySelector(selector)!).fontSize,
      );

    return {
      commentInfo: size(".comment-info"),
      heading: size("h1"),
    };
  });

  expectFontIncrease(postSizes.heading, 24);
  expectFontIncrease(postSizes.commentInfo, 13.12);
});

test("keeps larger type inside narrow viewports", async ({ page }) => {
  for (const width of [320, 375, 768, 1_440]) {
    await page.setViewportSize({ height: 900, width });
    for (const path of [TOP_PATH, KNOWN_POST_PATH, KNOWN_USER_PATH]) {
      await page.goto(path);

      const layout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        headerWidth: document.querySelector(".site-header")?.scrollWidth ?? 0,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
      expect(layout.headerWidth).toBeLessThanOrEqual(layout.clientWidth);
    }
  }
});

test("preserves a comment fragment through the legacy redirect", async ({
  page,
}) => {
  const path = `${KNOWN_POST_PATH}?from=legacy`;
  const fragment = "#comment-8864";
  const redirectServer = createServer((request, response) => {
    if (request.url?.startsWith("/legacy/") === true) {
      response.writeHead(308, { location: path });
      response.end();
      return;
    }

    response.writeHead(200, { "content-type": "text/html" });
    response.write("<!doctype html><title>Super HN</title>");
    response.end();
  });
  await new Promise<void>((resolve) => {
    redirectServer.listen(0, "localhost", resolve);
  });
  const address = redirectServer.address();
  if (address === null || typeof address === "string") {
    throw new Error("Redirect test server did not bind to a TCP port");
  }

  try {
    const origin = `http://localhost:${address.port}`;
    await page.goto(`${origin}/legacy${path}${fragment}`);
    await expect(page).toHaveURL(`${origin}${path}${fragment}`);
  } finally {
    redirectServer.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      redirectServer.close((error) => {
        if (error === undefined) {
          resolve();
          return;
        }

        reject(error);
      });
    });
  }
});

test("uses native disclosure for comment threads", async ({ page }) => {
  await page.goto(KNOWN_POST_PATH);

  const details = page.locator("details").first();
  const summary = details.locator("summary").first();
  await expect(details).toHaveJSProperty("open", true);

  await summary.click();
  await expect(details).toHaveJSProperty("open", false);

  await summary.click();
  await expect(details).toHaveJSProperty("open", true);
});

test("renders comments for a lagging active discussion", async ({ page }) => {
  await page.goto(ACTIVE_POST_PATH);

  await expect(page.locator("details").first()).toBeVisible();
  await expect(page.getByTestId("post-content")).not.toContainText(
    /\|\s*0 comments/u,
  );
});

test("preserves comment anchors", async ({ page }) => {
  await page.goto(`${KNOWN_POST_PATH}#comments`);

  await expect(page).toHaveURL(/#comments$/u);
  await expect(page.locator("#comments")).toBeVisible();
});

test("redirects comment routes to their containing discussion", async ({
  page,
}) => {
  await page.goto(`/post/${KNOWN_COMMENT_ID}`);

  await expect(page).toHaveURL(
    new RegExp(`${KNOWN_POST_PATH}#comment-${KNOWN_COMMENT_ID}$`, "u"),
  );
  await expect(page.locator(`#comment-${KNOWN_COMMENT_ID}`)).toBeVisible();
});
