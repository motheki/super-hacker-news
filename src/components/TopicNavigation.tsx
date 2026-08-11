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
	"inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded px-2 leading-none transition-colors hover:bg-black hover:text-white focus-visible:outline-2 motion-reduce:transition-none dark:hover:bg-white dark:hover:text-black";

export function TopicNavigation({ links }: { links: readonly TopicLink[] }) {
	const pathname = usePathname();
	const isTopicPage = links.some(link => link.href === pathname);

	return links.map(link => {
		const active = pathname === link.href;
		return (
			<Link
				aria-current={active ? "page" : undefined}
				className={`${linkClass} ${active ? "bg-black text-white dark:bg-white dark:text-black" : ""}`}
				href={link.href}
				key={link.href}
				prefetch={true}
				transitionTypes={[isTopicPage ? "topic-change" : "nav-back"]}
			>
				{link.title}
			</Link>
		);
	});
}
