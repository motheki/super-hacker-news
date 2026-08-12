import { type Key, type ReactNode, ViewTransition } from "react";

interface PageTransitionProps {
  readonly children: Readonly<ReactNode>;
  readonly transitionKey?: Key;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- ReactNode includes framework-owned mutable portal internals.
export const PageTransition = ({
  children,
  transitionKey,
}: PageTransitionProps) => (
  <ViewTransition
    key={transitionKey}
    enter="fade-in"
    exit="fade-out"
    default="none"
  >
    {children}
  </ViewTransition>
);
