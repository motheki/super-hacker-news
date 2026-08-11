import Link from "next/link";
import { PageTransition } from "~/components/PageTransition";

export default function NotFound() {
	return (
		<PageTransition>
			<section className="py-12 text-center">
				<h1 className="text-2xl">404 — Not found</h1>
				<Link className="eink-link mt-4 inline-block" href="/top">
					Return to Super HN
				</Link>
			</section>
		</PageTransition>
	);
}
