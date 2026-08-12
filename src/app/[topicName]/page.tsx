import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedItem } from "~/components/FeedItem";
import { PageTransition } from "~/components/PageTransition";
import { getTopicItems } from "~/lib/data";
import { parsePage } from "~/lib/route";
import { SOCIAL_IMAGE_PATH } from "~/lib/site";
import { TOPICS } from "~/lib/topic";
const ITEMS_PER_PAGE = 30;

// Keep the current route visible until this cached destination is ready, then fade once.
export const instant = false;

type TopicPageProps = Readonly<{
  params: Readonly<Promise<Readonly<{ topicName: string }>>>;
  searchParams: Readonly<
    Promise<Readonly<{ page?: string | readonly string[] }>>
  >;
}>;

export const generateStaticParams = () =>
  TOPICS.map(({ name: topicName }) => ({ topicName }));

export const generateMetadata = async ({
  params,
  searchParams,
}: TopicPageProps): Promise<Metadata> => {
  const [{ topicName }, query] = await Promise.all([params, searchParams]);
  const topic = TOPICS.find((item) => item.name === topicName);
  const page = parsePage(query.page);
  if (topic === undefined || page === null) return {};

  const canonical = `/${topic.name}${page > 1 ? `?page=${page}` : ""}`;
  return {
    ...(topic.title === "Top" ? {} : { title: topic.title }),
    alternates: { canonical },
    openGraph: {
      url: canonical,
      title: topic.title,
      images: [SOCIAL_IMAGE_PATH],
    },
    twitter: {
      card: "summary_large_image",
      title: topic.title,
      images: [SOCIAL_IMAGE_PATH],
    },
  };
};

export default async function TopicPage({
  params,
  searchParams,
}: TopicPageProps) {
  const [{ topicName }, query] = await Promise.all([params, searchParams]);
  const topic = TOPICS.find((item) => item.name === topicName);
  const page = parsePage(query.page);

  if (topic === undefined || page === null) {
    notFound();
  }

  const items = await getTopicItems(topic.value, page);
  if (items === null) {
    notFound();
  }

  return (
    <PageTransition transitionKey={`${topic.name}-${page}`}>
      <>
        <h1 className="sr-only">{topic.title}</h1>
        <div className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-4">
          {items.map((item, index) => (
            <FeedItem
              item={item}
              index={index + 1 + ITEMS_PER_PAGE * (page - 1)}
              key={item.id}
            />
          ))}
        </div>
        <Link
          className="eink-link mt-4 block"
          href={`/${topic.name}?page=${page + 1}`}
          prefetch={true}
        >
          More...
        </Link>
      </>
    </PageTransition>
  );
}
