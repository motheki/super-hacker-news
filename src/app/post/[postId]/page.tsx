import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { Comment } from "~/components/Comment";
import { JsonLd } from "~/components/JsonLd";
import { PageTransition } from "~/components/PageTransition";
import { getPost } from "~/lib/data";
import { renderHnHtml } from "~/lib/html";
import { isSafeExternalUrl } from "~/lib/link";
import { parsePostId } from "~/lib/route";
import { SITE_URL, SOCIAL_IMAGE_PATH } from "~/lib/site";

type PostPageProps = { params: Promise<{ postId: string }> };

export const generateMetadata = async ({ params }: PostPageProps): Promise<Metadata> => {
	const postId = parsePostId((await params).postId);
	if (postId === null) return {};
	const post = await getPost(postId);
	if (!post) return {};

	const description = `${post.points} points and ${post.comments_count} comments on Hacker News.`;
	const canonical = `/post/${post.id}`;
	return {
		title: post.title,
		description,
		alternates: { canonical },
		openGraph: {
			type: "article",
			url: canonical,
			title: post.title,
			description,
			images: [SOCIAL_IMAGE_PATH],
		},
		twitter: {
			card: "summary_large_image",
			title: post.title,
			description,
			images: [SOCIAL_IMAGE_PATH],
		},
	};
};

export default async function PostPage({ params }: PostPageProps) {
	const postId = parsePostId((await params).postId);
	if (postId === null) notFound();

	const post = await getPost(postId);
	if (!post) notFound();

	const externalUrl = isSafeExternalUrl(post.url) ? post.url : null;
	const title = (
		<>
			{post.title}
			{post.domain && <span className="eink-faint text-lg"> ({post.domain})</span>}
		</>
	);

	return (
		<PageTransition transitionKey={post.id}>
			<>
				<JsonLd
					value={{
						"@context": "https://schema.org",
						"@type": "DiscussionForumPosting",
						url: `${SITE_URL}/post/${post.id}`,
						headline: post.title,
						author: post.user
							? {
									"@type": "Person",
									name: post.user,
									url: `${SITE_URL}/user/${post.user}`,
								}
							: undefined,
						interactionStatistic: {
							"@type": "InteractionCounter",
							interactionType: "https://schema.org/CommentAction",
							userInteractionCount: post.comments_count,
						},
					}}
				/>
				<ViewTransition enter="fade-in" exit="fade-out" default="none">
					<h1 className="wrap-anywhere text-2xl">
						{externalUrl ? (
							<a
								href={externalUrl}
								rel="noreferrer noopener"
								className="eink-story-link"
							>
								{title}
							</a>
						) : (
							title
						)}
					</h1>
				</ViewTransition>

				<ViewTransition enter="fade-in" exit="fade-out" default="none">
					<>
						<section className="mb-4">
							<article>
								<p className="eink-muted mt-1 text-sm">
									{post.points} points by{" "}
									<Link className="eink-link" href={`/user/${post.user}`}>
										{post.user}
									</Link>{" "}
									{post.time_ago} | {post.comments_count}{" "}
									{post.comments_count === 1 ? "comment" : "comments"}
								</p>
								{post.content && (
									<div className="eink-rich-text wrap-anywhere border-b-2 border-dotted border-[var(--color-line)] [&_p]:my-2 [&_pre]:overflow-x-auto">
										{renderHnHtml(post.content)}
									</div>
								)}
							</article>
						</section>

						<div id="comments">
							{post.comments.map((comment, index) => (
								<Comment
									comment={comment}
									key={comment.id}
									rootId={comment.id}
									prevId={post.comments[index - 1]?.id}
									nextId={post.comments[index + 1]?.id}
								/>
							))}
						</div>
					</>
				</ViewTransition>
			</>
		</PageTransition>
	);
}
