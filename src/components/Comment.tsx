import { CollapsibleComment } from "~/components/CollapsibleComment";
import { IntentPrefetchLink } from "~/components/IntentPrefetchLink";
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

export const Comment = ({
  comment,
  rootId,
  parentId,
  prevId,
  nextId,
}: CommentProps) => (
  <CollapsibleComment
    body={
      <>
        {comment.content && (
          <div className="eink-rich-text wrap-anywhere [&_p]:my-2 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:text-sm [&_pre]:whitespace-pre-wrap">
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
          <IntentPrefetchLink
            className="eink-link"
            href={`/user/${comment.user}`}
          >
            {comment.user}
          </IntentPrefetchLink>
        )}{" "}
        <a className="eink-link" href={commentLink(comment.id)}>
          {comment.time_ago}
        </a>
        {rootId !== comment.id && (
          <>
            {" | "}
            <a className="eink-link" href={commentLink(rootId)}>
              root
            </a>
          </>
        )}
        {parentId && (
          <>
            {" | "}
            <a className="eink-link" href={commentLink(parentId)}>
              parent
            </a>
          </>
        )}
        {prevId && (
          <>
            {" | "}
            <a className="eink-link" href={commentLink(prevId)}>
              prev
            </a>
          </>
        )}
        {nextId && (
          <>
            {" | "}
            <a className="eink-link" href={commentLink(nextId)}>
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
