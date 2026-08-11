import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedItem } from "~/components/FeedItem";
import { PageTransition } from "~/components/PageTransition";
import { getTopicItems } from "~/lib/data";
import { TOPICS } from "~/lib/topic";
const ITEMS_PER_PAGE = 30;

type TopicPageProps = {
	params: Promise<{ topicName: string }>;
	searchParams: Promise<{ page?: string | string[] }>;
};

export const generateStaticParams = () => TOPICS.map(({ name: topicName }) => ({ topicName }));

export const generateMetadata = async ({ params }: TopicPageProps): Promise<Metadata> => {
	const { topicName } = await params;
	const topic = TOPICS.find(item => item.name === topicName);
	return topic && topic.title !== "Top" ? { title: topic.title } : {};
};

export default async function TopicPage({ params, searchParams }: TopicPageProps) {
	const [{ topicName }, query] = await Promise.all([params, searchParams]);
	const topic = TOPICS.find(item => item.name === topicName);
	const rawPage = Array.isArray(query.page) ? query.page[0] : query.page;
	const page = Number(rawPage ?? "1");

	if (!topic || !Number.isSafeInteger(page) || page < 1) {
		notFound();
	}

	const items = await getTopicItems(topic.value, page);
	if (!items) {
		notFound();
	}

	return (
		<PageTransition>
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
			<Link className="mt-4 block underline" href={`/${topic.name}?page=${page + 1}`}>
				More...
			</Link>
		</PageTransition>
	);
}
