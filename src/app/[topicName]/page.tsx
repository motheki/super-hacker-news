import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ViewportFeed } from "~/components/ViewportFeed";
import { PageTransition } from "~/components/PageTransition";
import { getTopicItems } from "~/lib/data";
import { parseFeedOffset, parsePage } from "~/lib/route";
import { SOCIAL_IMAGE_PATH } from "~/lib/site";
import { TOPICS } from "~/lib/topic";

// Keep the current route visible until this cached destination is ready, then fade once.
export const instant = false;

type TopicPageProps = Readonly<{
  params: Readonly<Promise<Readonly<{ topicName: string }>>>;
  searchParams: Readonly<
    Promise<
      Readonly<{
        offset?: string | readonly string[];
        page?: string | readonly string[];
      }>
    >
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
  const offset = parseFeedOffset(query.offset);
  if (topic === undefined || page === null || offset === null) return {};

  const queryString = new URLSearchParams();
  if (page > 1) queryString.set("page", String(page));
  if (offset > 0) queryString.set("offset", String(offset));
  const canonical = `/${topic.name}${queryString.size > 0 ? `?${queryString}` : ""}`;
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
  const offset = parseFeedOffset(query.offset);

  if (topic === undefined || page === null || offset === null) {
    notFound();
  }

  const items = await getTopicItems(topic.value, page);
  if (items === null) {
    notFound();
  }

  return (
    <PageTransition transitionKey={`${topic.name}-${page}-${offset}`}>
      <>
        <h1 className="sr-only">{topic.title}</h1>
        <ViewportFeed
          items={items}
          offset={offset}
          page={page}
          topicName={topic.name}
        />
      </>
    </PageTransition>
  );
}
