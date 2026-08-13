export const UPSTREAM_ITEMS_PER_PAGE = 30;

export function getFeedContinuation(
  page: number,
  offset: number,
  itemCount: number,
) {
  const absoluteOffset = offset + itemCount;
  const nextPage = page + Math.floor(absoluteOffset / UPSTREAM_ITEMS_PER_PAGE);
  const nextOffset = absoluteOffset % UPSTREAM_ITEMS_PER_PAGE;
  return {
    page: nextPage,
    ...(nextOffset === 0 ? {} : { offset: nextOffset }),
  };
}

export function getVisibleFeedCount(
  itemHeights: readonly number[],
  availableHeight: number,
  gap: number,
) {
  if (itemHeights.length === 0) return 0;

  let usedHeight = 0;
  let visibleCount = 0;

  for (const itemHeight of itemHeights) {
    const nextHeight = usedHeight + (visibleCount > 0 ? gap : 0) + itemHeight;
    if (nextHeight > availableHeight) break;
    usedHeight = nextHeight;
    visibleCount += 1;
  }

  return Math.max(1, visibleCount);
}
