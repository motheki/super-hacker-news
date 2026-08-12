"use client";

import {
  startTransition,
  type ReactNode,
  useState,
  ViewTransition,
} from "react";

interface CollapsibleCommentProps {
  body: ReactNode;
  children: ReactNode;
  commentCount: number;
  commentId: number;
  info: ReactNode;
}

export function CollapsibleComment({
  body,
  children,
  commentCount,
  commentId,
  info,
}: CollapsibleCommentProps) {
  const [expanded, setExpanded] = useState(true);
  const detailsId = `comment-details-${commentId}`;

  const toggle = () => {
    startTransition(() => {
      setExpanded((value) => !value);
    });
    requestAnimationFrame(() => {
      document
        .getElementById(`comment-info-${commentId}`)
        ?.scrollIntoView({ block: "nearest" });
    });
  };

  return (
    <article id={`comment-${commentId}`} className="mt-2 first:mt-0">
      <p
        id={`comment-info-${commentId}`}
        className="eink-muted scroll-mt-12 text-sm"
      >
        {info}
        {" | "}
        <button
          aria-controls={detailsId}
          aria-expanded={expanded}
          className="eink-link"
          onClick={toggle}
          type="button"
        >
          {expanded ? "[–]" : `[${commentCount + 1} more]`}
        </button>
      </p>

      {expanded && (
        <ViewTransition enter="fade-in" exit="fade-out" default="none">
          <div id={detailsId}>
            <div className="outline-offset-4" tabIndex={-1}>
              {body}
            </div>
            <div className="flex">
              <button
                aria-controls={detailsId}
                aria-expanded={expanded}
                aria-label="Fold comment"
                className="min-w-6 border-l-2 border-dotted border-[var(--color-line)] transition-colors hover:border-current motion-reduce:transition-none sm:min-w-8"
                onClick={toggle}
                tabIndex={-1}
                type="button"
              />
              <div className="min-w-0 flex-1">{children}</div>
            </div>
          </div>
        </ViewTransition>
      )}
    </article>
  );
}
