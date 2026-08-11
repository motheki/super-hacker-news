import Link from "next/link";
import { renderHnHtml } from "~/lib/html";
import type { Comment as CommentType } from "~/lib/post";

interface CommentProps {
	comment: CommentType;
	rootId: number;
	key?: number;
	parentId?: number;
	prevId?: number;
	nextId?: number;
}

const commentLink = (id: number) => `#comment-${id}`;

export const Comment = ({ comment, rootId, parentId, prevId, nextId }: CommentProps) => {
	const detailsId = `comment-details-${comment.id}`;

	return (
		<article
			id={`comment-${comment.id}`}
			className="mt-2 first:mt-0"
			data-comment-id={comment.id}
			data-comments-count={comment.comments_count}
			style={{ viewTransitionName: `comment-${comment.id}` }}
		>
			<p
				id={`comment-info-${comment.id}`}
				className="scroll-mt-12 text-sm"
				data-comment-info={comment.id}
			>
				{comment.user && (
					<Link className="underline" href={`/user/${comment.user}`} prefetch={false}>
						{comment.user}
					</Link>
				)}{" "}
				<Link className="hover:underline" href={commentLink(comment.id)}>
					{comment.time_ago}
				</Link>
				{rootId !== comment.id && (
					<>
						{" | "}
						<Link className="hover:underline" href={commentLink(rootId)}>
							root
						</Link>
					</>
				)}
				{parentId && (
					<>
						{" | "}
						<Link className="hover:underline" href={commentLink(parentId)}>
							parent
						</Link>
					</>
				)}
				{prevId && (
					<>
						{" | "}
						<Link className="hover:underline" href={commentLink(prevId)}>
							prev
						</Link>
					</>
				)}
				{nextId && (
					<>
						{" | "}
						<Link className="hover:underline" href={commentLink(nextId)}>
							next
						</Link>
					</>
				)}
				{" | "}
				<button
					aria-controls={detailsId}
					aria-expanded="true"
					className="underline"
					data-comment-toggle={comment.id}
					type="button"
				>
					<span data-comment-summary={comment.id}>[–]</span>
				</button>
			</p>

			<div id={detailsId} className="[&[hidden]]:hidden" data-comment-details={comment.id}>
				<div className="outline-offset-4" tabIndex={-1}>
					{comment.content && (
						<div className="wrap-anywhere [&_a]:underline [&_p]:my-2 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_pre]:text-sm">
							{renderHnHtml(comment.content)}
						</div>
					)}
					{comment.dead ? <div>dead</div> : comment.deleted && <div>deleted</div>}
				</div>

				<div className="flex">
					<button
						aria-controls={detailsId}
						aria-expanded="true"
						aria-label="Fold comment"
						className="min-w-6 border-l-2 border-dashed border-current transition-[border-style] hover:border-solid motion-reduce:transition-none sm:min-w-8"
						data-comment-toggle={comment.id}
						tabIndex={-1}
						type="button"
					/>
					<div className="min-w-0 flex-1">
						{comment.comments.map((reply, index) => (
							<Comment
								comment={reply}
								key={reply.id}
								rootId={rootId}
								parentId={comment.id}
								prevId={comment.comments[index - 1]?.id}
								nextId={comment.comments[index + 1]?.id}
							/>
						))}
					</div>
				</div>
			</div>
		</article>
	);
};
