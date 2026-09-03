import Link from "next/link";
import { Suspense } from "react";
import { REPOSITORY_URL } from "~/lib/site";
import { TOPICS } from "~/lib/topic";
import { ShareButton } from "./HeaderControls";
import { GitHubIcon } from "./icons/GitHubIcon";
import { MagnifyingGlassIcon } from "./icons/MagnifyingGlassIcon";
import { TopicNavigation } from "./TopicNavigation";

const interactiveClass =
  "eink-interactive inline-flex shrink-0 items-center justify-center rounded leading-none transition-colors focus-visible:outline-2 motion-reduce:transition-none";
const topicLinkClass = `${interactiveClass} h-9 whitespace-nowrap px-2`;
const iconClass = `${interactiveClass} size-9`;

const TopicNavigationFallback = () =>
  TOPICS.map(({ name, title }) => (
    <Link className={topicLinkClass} href={`/${name}`} key={name}>
      {title}
    </Link>
  ));

export const Header = () => (
  <header className="sticky top-0 z-10 mb-2 flex min-w-0 items-center bg-[var(--color-canvas)] py-2 sm:static">
    <nav
      aria-label="Topics"
      className="mr-auto flex min-w-0 items-center gap-0.5 sm:gap-2"
    >
      <Suspense fallback={<TopicNavigationFallback />}>
        <TopicNavigation />
      </Suspense>
    </nav>

    <div className="ml-1 flex shrink-0 items-center gap-0.5 sm:gap-1">
      <ShareButton />
      <a
        className={iconClass}
        title="Search Hacker News"
        href="https://hn.algolia.com"
        rel="noreferrer noopener"
      >
        <span className="sr-only">Search Hacker News</span>
        <MagnifyingGlassIcon className="size-6 shrink-0" />
      </a>
      <a
        className={`${iconClass} hidden sm:inline-flex`}
        title="Project source code"
        href={REPOSITORY_URL}
        rel="noreferrer noopener"
      >
        <span className="sr-only">Project source code</span>
        <GitHubIcon className="size-6 shrink-0" />
      </a>
    </div>
  </header>
);
