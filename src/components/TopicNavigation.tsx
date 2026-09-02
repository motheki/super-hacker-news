"use client";

import { usePathname } from "next/navigation";
import { IntentPrefetchLink } from "~/components/IntentPrefetchLink";
import type { TOPICS } from "~/lib/topic";

type TopicName = (typeof TOPICS)[number]["name"];

export interface TopicLink {
  readonly title: string;
  readonly href: `/${TopicName}`;
}

const linkClass =
  "eink-interactive inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded px-2 leading-none transition-colors focus-visible:outline-2 motion-reduce:transition-none";

export function TopicNavigation({
  links,
}: Readonly<{ links: readonly TopicLink[] }>) {
  const pathname = usePathname();

  return links.map((link) => {
    const active = pathname === link.href;
    return (
      <IntentPrefetchLink
        aria-current={active ? "page" : undefined}
        className={`${linkClass} ${active ? "eink-selected" : ""}`}
        href={link.href}
        key={link.href}
      >
        {link.title}
      </IntentPrefetchLink>
    );
  });
}
