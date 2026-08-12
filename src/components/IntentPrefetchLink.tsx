"use client";

import Link, { type LinkProps } from "next/link";
import { useState } from "react";

type IntentPrefetchLinkProps<RouteType> = Omit<
  LinkProps<RouteType>,
  "prefetch"
>;

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Next.js Link props contain framework-owned mutable event types.
export function IntentPrefetchLink<RouteType>({
  ...props
}: Readonly<IntentPrefetchLinkProps<RouteType>>) {
  const [prefetchOnIntent, setPrefetchOnIntent] = useState(false);
  const enableRuntimePrefetch = () => {
    setPrefetchOnIntent(true);
  };

  return (
    <Link
      {...props}
      onFocusCapture={enableRuntimePrefetch}
      onMouseOverCapture={enableRuntimePrefetch}
      onTouchStartCapture={enableRuntimePrefetch}
      prefetch={prefetchOnIntent ? true : null}
    />
  );
}
