import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Comment } from "~/components/Comment";
import { CommentFolding } from "~/components/CommentFolding";
import { PageTransition } from "~/components/PageTransition";
import { getPost } from "~/lib/data";
import { renderHnHtml } from "~/lib/html";

type PostPageProps = { params: Promise<{ postId: string }> };

const parsePostId = (value: string) => {
	const postId = Number(value);
	return Number.isSafeInteger(postId) && postId > 0 ? postId : null;
};

export const generateMetadata = async ({ params }: PostPageProps): Promise<Metadata> => {
	const postId = parsePostId((await params).postId);
	if (postId === null) return {};
	const post = await getPost(postId);
	return post ? { title: post.title } : {};
};

export default async function PostPage({ params }: PostPageProps) {
	const postId = parsePostId((await params).postId);
	if (postId === null) notFound();

	const post = await getPost(postId);
	if (!post) notFound();

	const isExternal = post.url?.startsWith("http");
	const title = (
		<>
			{post.title}
			{post.domain && <span className="text-lg"> ({post.domain})</span>}
		</>
	);

	return (
		<PageTransition>
			<section className="mb-4">
				<article>
					<h1
						className="wrap-anywhere text-2xl"
						style={{ viewTransitionName: `story-${post.id}` }}
					>
						{isExternal ? (
							<Link
								href={post.url}
								rel="noreferrer noopener"
								className="hover:underline"
							>
								{title}
							</Link>
						) : (
							title
						)}
					</h1>
					<p className="mt-1 text-sm">
						{post.points} points by{" "}
						<Link className="underline" href={`/user/${post.user}`} prefetch={false}>
							{post.user}
						</Link>{" "}
						{post.time_ago} | {post.comments_count}{" "}
						{post.comments_count === 1 ? "comment" : "comments"}
					</p>
					{post.content && (
						<div className="wrap-anywhere border-b-2 border-current [&_a]:underline [&_p]:my-2 [&_pre]:overflow-x-auto">
							{renderHnHtml(post.content)}
						</div>
					)}
				</article>
			</section>

			<div id="comments">
				<CommentFolding containerId="comments" />
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
		</PageTransition>
	);
}
