import type { ReactNode } from "react";

interface CollapsibleCommentProps {
  readonly body: Readonly<ReactNode>;
  readonly children: Readonly<ReactNode>;
  readonly commentCount: number;
  readonly commentId: number;
  readonly info: Readonly<ReactNode>;
}

export function CollapsibleComment({
  body,
  children,
  commentCount,
  commentId,
  info,
}: Readonly<CollapsibleCommentProps>) {
  const detailsId = `comment-details-${commentId}`;

  return (
    <article id={`comment-${commentId}`} className="mt-2 first:mt-0">
      <details className="group" open>
        <summary
          className="eink-muted cursor-pointer list-none scroll-mt-12 text-sm [&::-webkit-details-marker]:hidden"
          id={`comment-info-${commentId}`}
        >
          {info}
          {" | "}
          <span className="group-open:hidden">[{commentCount + 1} more]</span>
          <span className="hidden group-open:inline">[–]</span>
        </summary>

        <div id={detailsId}>
          <div className="outline-offset-4" tabIndex={-1}>
            {body}
          </div>
          <div className="ml-3 min-w-0 border-l-2 border-dotted border-[var(--color-line)] pl-3 sm:ml-4 sm:pl-4">
            {children}
          </div>
        </div>
      </details>
    </article>
  );
}
