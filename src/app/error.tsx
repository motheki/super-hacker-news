"use client";

import { startTransition, ViewTransition } from "react";
import { PageTransition } from "~/components/PageTransition";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
	return (
		<PageTransition>
			<ViewTransition enter="fade-in" exit="fade-out" default="none">
				<section className="py-12 text-center">
					<h1 className="text-2xl">Something went wrong</h1>
					<button
						className="mt-4 border-2 border-current px-3 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
						onClick={() => startTransition(reset)}
					>
						Try again
					</button>
				</section>
			</ViewTransition>
		</PageTransition>
	);
}
