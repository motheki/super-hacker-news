import Link from "next/link";
import type { TopicItem } from "~/lib/topic";

interface FeedItemProps {
	item: TopicItem;
	index: number;
	key?: number;
}

const titleClass = "wrap-anywhere hover:underline";

export const FeedItem = ({ item, index }: FeedItemProps) => {
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
				<h2 style={{ viewTransitionName: `story-${item.id}` }}>
					{item.domain && item.url ? (
						<Link className={titleClass} href={item.url} rel="noreferrer noopener">
							{title}
						</Link>
					) : (
						<Link className={titleClass} href={`/post/${item.id}`}>
							{title}
						</Link>
					)}
				</h2>
				{item.type === "job" ? (
					<p className="mt-1 text-sm">{item.time_ago}</p>
				) : (
					<p className="mt-1 text-sm">
						{item.points} points by{" "}
						<Link className="underline" href={`/user/${item.user}`} prefetch={false}>
							{item.user}
						</Link>{" "}
						{item.time_ago}
						{" | "}
						<Link className="underline" href={`/post/${item.id}`}>
							{item.comments_count}&nbsp;
							{item.comments_count === 1 ? "comment" : "comments"}
						</Link>
					</p>
				)}
			</article>
		</>
	);
};
