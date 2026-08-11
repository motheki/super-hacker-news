import Link from "next/link";
import { ViewTransition } from "react";
import { PageTransition } from "~/components/PageTransition";

export default function NotFound() {
	return (
		<PageTransition>
			<ViewTransition enter="fade-in" default="none">
				<section className="py-12 text-center">
					<h1 className="text-2xl">404 — Not found</h1>
					<Link
						className="eink-link mt-4 inline-block"
						href="/top"
						transitionTypes={["nav-back"]}
					>
						Return to Super HN
					</Link>
				</section>
			</ViewTransition>
		</PageTransition>
	);
}
