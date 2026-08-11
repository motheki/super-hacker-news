import Link from "next/link";
import { CollapsibleComment } from "~/components/CollapsibleComment";
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

export const Comment = ({ comment, rootId, parentId, prevId, nextId }: CommentProps) => (
	<CollapsibleComment
		body={
			<>
				{comment.content && (
					<div className="wrap-anywhere [&_a]:underline [&_p]:my-2 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_pre]:text-sm">
						{renderHnHtml(comment.content)}
					</div>
				)}
				{comment.dead ? <div>dead</div> : comment.deleted && <div>deleted</div>}
			</>
		}
		commentCount={comment.comments_count ?? 0}
		commentId={comment.id}
		info={
			<>
				{comment.user && (
					<Link
						className="underline"
						href={`/user/${comment.user}`}
						transitionTypes={["nav-forward"]}
					>
						{comment.user}
					</Link>
				)}{" "}
				<a className="hover:underline" href={commentLink(comment.id)}>
					{comment.time_ago}
				</a>
				{rootId !== comment.id && (
					<>
						{" | "}
						<a className="hover:underline" href={commentLink(rootId)}>
							root
						</a>
					</>
				)}
				{parentId && (
					<>
						{" | "}
						<a className="hover:underline" href={commentLink(parentId)}>
							parent
						</a>
					</>
				)}
				{prevId && (
					<>
						{" | "}
						<a className="hover:underline" href={commentLink(prevId)}>
							prev
						</a>
					</>
				)}
				{nextId && (
					<>
						{" | "}
						<a className="hover:underline" href={commentLink(nextId)}>
							next
						</a>
					</>
				)}
			</>
		}
	>
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
	</CollapsibleComment>
);
