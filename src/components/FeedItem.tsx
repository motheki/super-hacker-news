import { IntentPrefetchLink } from "~/components/IntentPrefetchLink";
import { isSafeExternalUrl } from "~/lib/link";
import type { TopicItem } from "~/lib/topic";

interface FeedItemProps {
	item: TopicItem;
	index: number;
	key?: number;
}

const titleClass = "eink-story-link wrap-anywhere";

export const FeedItem = ({ item, index }: FeedItemProps) => {
	const externalUrl = isSafeExternalUrl(item.url) ? item.url : null;
	const title = (
		<>
			{item.title}{" "}
			{item.domain && <span className="eink-faint text-sm">({item.domain})</span>}
		</>
	);

	return (
		<>
			<span className="eink-muted text-right text-2xl" aria-hidden="true">
				{index}
			</span>
			<article className="min-w-0 text-lg">
				<h2>
					{externalUrl ? (
						<a className={titleClass} href={externalUrl} rel="noreferrer noopener">
							{title}
						</a>
					) : (
						<IntentPrefetchLink className={titleClass} href={`/post/${item.id}`}>
							{title}
						</IntentPrefetchLink>
					)}
				</h2>
				{item.type === "job" ? (
					<p className="eink-muted mt-1 text-sm">{item.time_ago}</p>
				) : (
					<p className="eink-muted mt-1 text-sm">
						{item.points} points
						{item.user && (
							<>
								{" by "}
								<IntentPrefetchLink
									className="eink-link"
									href={`/user/${item.user}`}
								>
									{item.user}
								</IntentPrefetchLink>
							</>
						)}{" "}
						{item.time_ago}
						{" | "}
						<IntentPrefetchLink className="eink-link" href={`/post/${item.id}`}>
							{item.comments_count}&nbsp;
							{item.comments_count === 1 ? "comment" : "comments"}
						</IntentPrefetchLink>
					</p>
				)}
			</article>
		</>
	);
};
