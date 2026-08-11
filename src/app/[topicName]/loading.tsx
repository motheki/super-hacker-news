import { ViewTransition } from "react";
import { LoadingState } from "~/components/LoadingState";
import { PageTransition } from "~/components/PageTransition";

export default function Loading() {
	return (
		<PageTransition>
			<ViewTransition exit="slide-down" default="none">
				<LoadingState label="Loading stories…" />
			</ViewTransition>
		</PageTransition>
	);
}
