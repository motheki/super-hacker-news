import { Fragment } from "react";
import Link from "next/link";
import { CollapsibleComment } from "~/components/CollapsibleComment";
import { renderHnHtml } from "~/lib/html";
import type { Comment as CommentType } from "~/lib/post";

interface CommentProps {
  readonly comment: CommentType;
  readonly rootId: number;
  readonly key?: number;
  readonly parentId?: number;
  readonly prevId?: number;
  readonly nextId?: number;
}

const commentLink = (id: number) => `#comment-${id}`;
type CommentNavigation = Readonly<{ id: number; label: string }>;

const CommentBody = ({ comment }: Readonly<{ comment: CommentType }>) => (
  <>
    {comment.content !== undefined && comment.content.length > 0 && (
      <div className="eink-rich-text wrap-anywhere [&_p]:my-2 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:text-sm [&_pre]:whitespace-pre-wrap">
        {renderHnHtml(comment.content)}
      </div>
    )}
    {comment.dead === true ? (
      <div>dead</div>
    ) : comment.deleted === true ? (
      <div>deleted</div>
    ) : null}
  </>
);

const CommentInfo = ({
  comment,
  rootId,
  parentId,
  prevId,
  nextId,
}: Readonly<CommentProps>) => {
  const navigation: CommentNavigation[] = [];
  if (rootId !== comment.id) navigation.push({ id: rootId, label: "root" });
  if (parentId !== undefined)
    navigation.push({ id: parentId, label: "parent" });
  if (prevId !== undefined) navigation.push({ id: prevId, label: "prev" });
  if (nextId !== undefined) navigation.push({ id: nextId, label: "next" });

  return (
    <>
      {comment.user !== undefined && comment.user.length > 0 && (
        <Link className="eink-link" href={`/user/${comment.user}`}>
          {comment.user}
        </Link>
      )}{" "}
      <a className="eink-link" href={commentLink(comment.id)}>
        {comment.time_ago}
      </a>
      {navigation.map(({ id, label }) => (
        <Fragment key={label}>
          {" | "}
          <a className="eink-link" href={commentLink(id)}>
            {label}
          </a>
        </Fragment>
      ))}
    </>
  );
};

export const Comment = (props: Readonly<CommentProps>) => {
  const { comment, rootId } = props;
  return (
    <CollapsibleComment
      body={<CommentBody comment={comment} />}
      commentCount={comment.comments_count ?? 0}
      commentId={comment.id}
      info={<CommentInfo {...props} />}
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
};
