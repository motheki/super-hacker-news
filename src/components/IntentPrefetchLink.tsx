"use client";

import Link, { type LinkProps } from "next/link";
import { useState } from "react";

type IntentPrefetchLinkProps<RouteType> = Omit<
  LinkProps<RouteType>,
  "prefetch"
>;

export function IntentPrefetchLink<RouteType>({
  onFocus,
  onMouseEnter,
  onTouchStart,
  ...props
}: IntentPrefetchLinkProps<RouteType>) {
  const [prefetchOnIntent, setPrefetchOnIntent] = useState(false);
  const enableRuntimePrefetch = () => {
    setPrefetchOnIntent(true);
  };

  return (
    <Link
      {...props}
      onFocus={(event) => {
        enableRuntimePrefetch();
        onFocus?.(event);
      }}
      onMouseEnter={(event) => {
        enableRuntimePrefetch();
        onMouseEnter?.(event);
      }}
      onTouchStart={(event) => {
        enableRuntimePrefetch();
        onTouchStart?.(event);
      }}
      prefetch={prefetchOnIntent ? true : null}
    />
  );
}
