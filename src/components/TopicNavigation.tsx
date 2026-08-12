"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { TOPICS } from "~/lib/topic";

type TopicName = (typeof TOPICS)[number]["name"];

export interface TopicLink {
  title: string;
  href: `/${TopicName}`;
}

const linkClass =
  "eink-interactive inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded px-2 leading-none transition-colors focus-visible:outline-2 motion-reduce:transition-none";

export function TopicNavigation({ links }: { links: readonly TopicLink[] }) {
  const pathname = usePathname();

  return links.map((link) => {
    const active = pathname === link.href;
    return (
      <Link
        aria-current={active ? "page" : undefined}
        className={`${linkClass} ${active ? "eink-selected" : ""}`}
        href={link.href}
        key={link.href}
        prefetch={true}
      >
        {link.title}
      </Link>
    );
  });
}
