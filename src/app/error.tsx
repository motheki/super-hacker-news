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
						className="eink-interactive mt-4 border-2 border-dotted border-[var(--color-line)] px-3 py-2"
						onClick={() => startTransition(reset)}
					>
						Try again
					</button>
				</section>
			</ViewTransition>
		</PageTransition>
	);
}
