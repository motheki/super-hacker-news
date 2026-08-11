import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTransition } from "~/components/PageTransition";
import { getUser } from "~/lib/data";
import { renderHnHtml } from "~/lib/html";

type UserPageProps = { params: Promise<{ userName: string }> };

export const generateMetadata = async ({ params }: UserPageProps): Promise<Metadata> => {
	const { userName } = await params;
	return { title: userName };
};

export default async function UserPage({ params }: UserPageProps) {
	const { userName } = await params;
	const user = await getUser(userName);
	if (!user) notFound();

	return (
		<PageTransition>
			<section>
				<h1 className="text-2xl">{user.id}</h1>
				<div className="grid grid-cols-[max-content_1fr] gap-x-2 text-sm">
					<span>Created:</span>
					<span>{user.created}</span>
					<span>Karma:</span>
					<span>{user.karma}</span>
				</div>

				<p className="my-4">
					<Link
						className="underline"
						href={`https://news.ycombinator.com/submitted?id=${user.id}`}
					>
						submissions
					</Link>
					{" / "}
					<Link
						className="underline"
						href={`https://news.ycombinator.com/threads?id=${user.id}`}
					>
						comments
					</Link>
					{" / "}
					<Link
						className="underline"
						href={`https://news.ycombinator.com/favorites?id=${user.id}`}
					>
						favorites
					</Link>
				</p>

				{user.about && (
					<div className="wrap-anywhere [&_a]:underline [&_p]:my-4">
						{renderHnHtml(user.about)}
					</div>
				)}
			</section>
		</PageTransition>
	);
}
