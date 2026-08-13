"use client";

import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { FeedItem } from "~/components/FeedItem";
import { getVisibleFeedCount, UPSTREAM_ITEMS_PER_PAGE } from "~/lib/feed";
import type { TopicItem, TopicName } from "~/lib/topic";

interface ViewportFeedProps {
  readonly items: readonly TopicItem[];
  readonly offset: number;
  readonly page: number;
  readonly topicName: TopicName;
}

const GAP_PX = 16;
const RESERVED_VERTICAL_SPACE_PX = 32;

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM collections are mutable browser-owned objects.
const getRowHeights = (measurement: HTMLDivElement) => {
  const children = Array.from(measurement.children);
  const heights: number[] = [];
  for (let index = 0; index < children.length; index += 2) {
    heights.push(
      Math.max(
        children[index]?.getBoundingClientRect().height ?? 0,
        children[index + 1]?.getBoundingClientRect().height ?? 0,
      ),
    );
  }
  return heights;
};

function useVisibleFeedCount(items: readonly TopicItem[]) {
  const feedRef = useRef<HTMLDivElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(1);

  useLayoutEffect(() => {
    const update = () => {
      const feed = feedRef.current;
      const measurement = measurementRef.current;
      const footer = footerRef.current;
      if (feed === null || measurement === null || footer === null) return;
      const availableHeight = Math.max(
        0,
        window.innerHeight -
          feed.getBoundingClientRect().top -
          footer.offsetHeight -
          RESERVED_VERTICAL_SPACE_PX,
      );
      setVisibleCount(
        getVisibleFeedCount(
          getRowHeights(measurement),
          availableHeight,
          GAP_PX,
        ),
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(document.documentElement);
    const measurement = measurementRef.current;
    const footer = footerRef.current;
    if (measurement !== null) observer.observe(measurement);
    if (footer !== null) observer.observe(footer);
    return () => {
      observer.disconnect();
    };
  }, [items]);

  return { feedRef, footerRef, measurementRef, visibleCount };
}

// oxlint-disable-next-line max-lines-per-function -- The cohesive feed render keeps SSR and hydrated variants aligned.
export function ViewportFeed(props: Readonly<ViewportFeedProps>) {
  const { items, offset, page, topicName } = props;
  const remainingItems = useMemo(() => items.slice(offset), [items, offset]);
  const { feedRef, footerRef, measurementRef, visibleCount } =
    useVisibleFeedCount(remainingItems);
  const indexOffset = UPSTREAM_ITEMS_PER_PAGE * (page - 1) + offset;
  const nextOffset = offset + visibleCount;
  const renderItem = (item: TopicItem, index: number) => (
    <FeedItem item={item} index={index + 1 + indexOffset} key={item.id} />
  );
  const continuationQuery =
    nextOffset < items.length
      ? { page, offset: nextOffset }
      : { page: page + 1 };

  return (
    <>
      <div className="viewport-feed-fallback grid grid-cols-[max-content_1fr] gap-x-6 gap-y-4">
        {remainingItems.map((item, index) => renderItem(item, index))}
      </div>
      <div
        ref={feedRef}
        className="viewport-feed-client grid-cols-[max-content_1fr] gap-x-6 gap-y-4"
      >
        {remainingItems
          .slice(0, visibleCount)
          .map((item, index) => renderItem(item, index))}
      </div>
      <div
        ref={measurementRef}
        className="pointer-events-none invisible fixed top-0 right-2 left-2 -z-10 mx-auto grid max-w-3xl grid-cols-[max-content_1fr] gap-x-6 gap-y-4"
        aria-hidden="true"
        inert={true}
      >
        {remainingItems.map((item, index) => renderItem(item, index))}
      </div>
      <div ref={footerRef} className="mt-4">
        <p className="viewport-feed-client eink-muted mb-1 text-sm">
          Showing {visibleCount} {visibleCount === 1 ? "story" : "stories"}.{" "}
          “More stories” continues with the next stories.
        </p>
        <p className="viewport-feed-fallback eink-muted mb-1 text-sm">
          Showing {remainingItems.length} stories. “More stories” continues with
          the next feed page.
        </p>
        <Link
          className="viewport-feed-client eink-link"
          href={{ pathname: `/${topicName}`, query: continuationQuery }}
          prefetch={true}
        >
          More stories...
        </Link>
        <Link
          className="viewport-feed-fallback eink-link"
          href={{ pathname: `/${topicName}`, query: { page: page + 1 } }}
          prefetch={true}
        >
          More stories...
        </Link>
      </div>
    </>
  );
}
