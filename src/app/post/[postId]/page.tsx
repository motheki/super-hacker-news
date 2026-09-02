import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Comment } from "~/components/Comment";
import { IntentPrefetchLink } from "~/components/IntentPrefetchLink";
import { JsonLd } from "~/components/JsonLd";
import { RouteLoading } from "~/components/RouteLoading";
import { getPost, getRootItemId } from "~/lib/data";
import { renderHnHtml } from "~/lib/html";
import { isSafeExternalUrl } from "~/lib/link";
import type { Post } from "~/lib/post";
import { parsePostId } from "~/lib/route";
import { SITE_URL, SOCIAL_IMAGE_PATH } from "~/lib/site";

type PostPageProps = Readonly<{
  params: Readonly<Promise<Readonly<{ postId: string }>>>;
}>;

export const generateMetadata = async ({
  params,
}: PostPageProps): Promise<Metadata> => {
  const postId = parsePostId((await params).postId);
  if (postId === null) return {};
  const post = await getPost(postId);
  if (post === null) return {};

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

const PostStructuredData = ({ post }: Readonly<{ post: Post }>) => (
  <JsonLd
    value={{
      "@context": "https://schema.org",
      "@type": "DiscussionForumPosting",
      url: `${SITE_URL}/post/${post.id}`,
      headline: post.title,
      author: {
        "@type": "Person",
        name: post.user,
        url: `${SITE_URL}/user/${post.user}`,
      },
      interactionStatistic: {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: post.comments_count,
      },
    }}
  />
);

const PostTitle = ({
  post,
  externalUrl,
}: Readonly<{ post: Post; externalUrl: string | null }>) => {
  const title = (
    <>
      {post.title}
      {post.domain !== undefined && post.domain.length > 0 && (
        <span className="eink-faint text-lg"> ({post.domain})</span>
      )}
    </>
  );
  return (
    <h1 className="text-2xl wrap-anywhere">
      {externalUrl === null ? (
        title
      ) : (
        <a
          href={externalUrl}
          rel="noreferrer noopener"
          className="eink-story-link"
        >
          {title}
        </a>
      )}
    </h1>
  );
};

const PostDetails = ({ post }: Readonly<{ post: Post }>) => (
  <section className="mb-4">
    <article>
      <p className="eink-muted mt-1 text-sm">
        {post.points} points by{" "}
        <IntentPrefetchLink className="eink-link" href={`/user/${post.user}`}>
          {post.user}
        </IntentPrefetchLink>{" "}
        {post.time_ago} | {post.comments_count}{" "}
        {post.comments_count === 1 ? "comment" : "comments"}
      </p>
      {post.content !== undefined && post.content.length > 0 && (
        <div className="eink-rich-text border-b-2 border-dotted border-[var(--color-line)] wrap-anywhere [&_p]:my-2 [&_pre]:overflow-x-auto">
          {renderHnHtml(post.content)}
        </div>
      )}
    </article>
  </section>
);

const PostComments = ({ post }: Readonly<{ post: Post }>) => (
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
);

export default function PostPage(props: PostPageProps) {
  return (
    <div data-testid="post-shell">
      <Suspense fallback={<RouteLoading label="discussion" />}>
        <PostContent {...props} />
      </Suspense>
    </div>
  );
}

async function PostContent({ params }: PostPageProps) {
  const postId = parsePostId((await params).postId);
  if (postId === null) notFound();

  const post = await getPost(postId);
  if (post === null) {
    const rootItemId = await getRootItemId(postId);
    if (rootItemId !== null && rootItemId !== postId) {
      redirect(`/post/${rootItemId}#comment-${postId}`);
    }
    notFound();
  }

  const externalUrl = isSafeExternalUrl(post.url) ? post.url : null;
  return (
    <div data-testid="post-content">
      <PostStructuredData post={post} />
      <PostTitle externalUrl={externalUrl} post={post} />
      <PostDetails post={post} />
      <PostComments post={post} />
    </div>
  );
}
