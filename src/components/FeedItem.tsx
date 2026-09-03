import Link from "next/link";
import { isSafeExternalUrl } from "~/lib/link";
import type { TopicItem } from "~/lib/topic";

interface FeedItemProps {
  readonly item: TopicItem;
  readonly index: number;
  readonly key?: number;
}

const titleClass = "eink-story-link wrap-anywhere";

const FeedItemTitle = ({ item }: Readonly<{ item: TopicItem }>) => (
  <>
    {item.title}{" "}
    {item.domain !== undefined && item.domain.length > 0 && (
      <span className="eink-faint text-sm">({item.domain})</span>
    )}
  </>
);

const FeedItemMeta = ({ item }: Readonly<{ item: TopicItem }>) =>
  item.type === "job" ? (
    <p className="eink-muted mt-1 text-sm">{item.time_ago}</p>
  ) : (
    <p className="eink-muted mt-1 text-sm">
      {item.points} points
      {item.user !== undefined &&
        item.user !== null &&
        item.user.length > 0 && (
          <>
            {" by "}
            <Link className="eink-link" href={`/user/${item.user}`}>
              {item.user}
            </Link>
          </>
        )}{" "}
      {item.time_ago}
      {" | "}
      <Link className="eink-link" href={`/post/${item.id}`}>
        {item.comments_count}&nbsp;
        {item.comments_count === 1 ? "comment" : "comments"}
      </Link>
    </p>
  );

export const FeedItem = ({ item, index }: Readonly<FeedItemProps>) => {
  const externalUrl = isSafeExternalUrl(item.url) ? item.url : null;
  const title = <FeedItemTitle item={item} />;

  return (
    <>
      <span className="eink-muted text-right text-2xl" aria-hidden="true">
        {index}
      </span>
      <article className="min-w-0 text-lg">
        <h2>
          {externalUrl === null ? (
            <Link className={titleClass} href={`/post/${item.id}`}>
              {title}
            </Link>
          ) : (
            <a
              className={titleClass}
              href={externalUrl}
              rel="noreferrer noopener"
            >
              {title}
            </a>
          )}
        </h2>
        <FeedItemMeta item={item} />
      </article>
    </>
  );
};
