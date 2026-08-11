"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
	return (
		<section className="py-12 text-center">
			<h1 className="text-2xl">Something went wrong</h1>
			<button
				className="mt-4 border-2 border-current px-3 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
				onClick={reset}
			>
				Try again
			</button>
		</section>
	);
}
