export const UPSTREAM_ITEMS_PER_PAGE = 30;

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
