"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { TOPICS } from "~/lib/topic";

const linkClass =
  "eink-interactive inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded px-2 leading-none transition-colors focus-visible:outline-2 motion-reduce:transition-none";

export function TopicNavigation() {
  const activeTopic = useSelectedLayoutSegment();

  return TOPICS.map(({ name, title }) => {
    const active = activeTopic === name;
    return (
      <Link
        aria-current={active ? "page" : undefined}
        className={`${linkClass} ${active ? "eink-selected" : ""}`}
        href={`/${name}`}
        key={name}
        prefetch
      >
        {title}
      </Link>
    );
  });
}
