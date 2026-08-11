import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { PageTransition } from "~/components/PageTransition";
import { getUser } from "~/lib/data";
import { renderHnHtml } from "~/lib/html";
import { isValidUserName } from "~/lib/route";
import { SOCIAL_IMAGE_PATH } from "~/lib/site";

type UserPageProps = { params: Promise<{ userName: string }> };

export const generateMetadata = async ({ params }: UserPageProps): Promise<Metadata> => {
	const { userName } = await params;
	if (!isValidUserName(userName)) return {};
	const user = await getUser(userName);
	if (!user) return {};

	const title = user.id;
	const description = `Hacker News profile for ${user.id}, with ${user.karma} karma.`;
	const canonical = `/user/${encodeURIComponent(user.id)}`;
	return {
		title,
		description,
		alternates: { canonical },
		openGraph: {
			type: "profile",
			url: canonical,
			title,
			description,
			images: [SOCIAL_IMAGE_PATH],
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: [SOCIAL_IMAGE_PATH],
		},
	};
};

export default async function UserPage({ params }: UserPageProps) {
	const { userName } = await params;
	if (!isValidUserName(userName)) notFound();

	const user = await getUser(userName);
	if (!user) notFound();

	return (
		<PageTransition transitionKey={user.id}>
			<ViewTransition enter="slide-up" default="none">
				<section>
					<h1 className="text-2xl">{user.id}</h1>
					<div className="eink-muted grid grid-cols-[max-content_1fr] gap-x-2 text-sm">
						<span>Created:</span>
						<span>{user.created}</span>
						<span>Karma:</span>
						<span>{user.karma}</span>
					</div>

					<p className="my-4">
						<a
							className="eink-link"
							href={`https://news.ycombinator.com/submitted?id=${encodeURIComponent(user.id)}`}
						>
							submissions
						</a>
						{" / "}
						<a
							className="eink-link"
							href={`https://news.ycombinator.com/threads?id=${encodeURIComponent(user.id)}`}
						>
							comments
						</a>
						{" / "}
						<a
							className="eink-link"
							href={`https://news.ycombinator.com/favorites?id=${encodeURIComponent(user.id)}`}
						>
							favorites
						</a>
					</p>

					{user.about && (
						<div className="eink-rich-text wrap-anywhere [&_p]:my-4">
							{renderHnHtml(user.about)}
						</div>
					)}
				</section>
			</ViewTransition>
		</PageTransition>
	);
}
