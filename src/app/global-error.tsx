"use client";

import { startTransition } from "react";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
	return (
		<html lang="en">
			<body>
				<main style={{ fontFamily: "monospace", padding: "3rem", textAlign: "center" }}>
					<h1>Something went wrong</h1>
					<p>The application could not finish loading.</p>
					<button onClick={() => startTransition(reset)} type="button">
						Try again
					</button>
				</main>
			</body>
		</html>
	);
}
