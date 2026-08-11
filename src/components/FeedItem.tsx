import Link from "next/link";
import { ViewTransition } from "react";
import { isSafeExternalUrl } from "~/lib/link";
import type { TopicItem } from "~/lib/topic";

interface FeedItemProps {
	item: TopicItem;
	index: number;
	key?: number;
}

const titleClass = "wrap-anywhere hover:underline";

export const FeedItem = ({ item, index }: FeedItemProps) => {
	const externalUrl = isSafeExternalUrl(item.url) ? item.url : null;
	const title = (
		<>
			{item.title} {item.domain && <span className="text-sm">({item.domain})</span>}
		</>
	);

	return (
		<>
			<span className="text-right text-2xl" aria-hidden="true">
				{index}
			</span>
			<article className="min-w-0 text-lg">
				<ViewTransition name={`story-${item.id}`} share="text-morph" default="none">
					<h2>
						{externalUrl ? (
							<a className={titleClass} href={externalUrl} rel="noreferrer noopener">
								{title}
							</a>
						) : (
							<Link
								className={titleClass}
								href={`/post/${item.id}`}
								transitionTypes={["story-forward"]}
							>
								{title}
							</Link>
						)}
					</h2>
				</ViewTransition>
				{item.type === "job" ? (
					<p className="mt-1 text-sm">{item.time_ago}</p>
				) : (
					<p className="mt-1 text-sm">
						{item.points} points
						{item.user && (
							<>
								{" by "}
								<Link
									className="underline"
									href={`/user/${item.user}`}
									transitionTypes={["nav-forward"]}
								>
									{item.user}
								</Link>
							</>
						)}{" "}
						{item.time_ago}
						{" | "}
						<Link
							className="underline"
							href={`/post/${item.id}`}
							transitionTypes={["story-forward"]}
						>
							{item.comments_count}&nbsp;
							{item.comments_count === 1 ? "comment" : "comments"}
						</Link>
					</p>
				)}
			</article>
		</>
	);
};
