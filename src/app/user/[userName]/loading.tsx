import { ViewTransition } from "react";
import { LoadingState } from "~/components/LoadingState";
import { PageTransition } from "~/components/PageTransition";

export default function Loading() {
	return (
		<PageTransition>
			<ViewTransition exit="fade-out" default="none">
				<LoadingState label="Loading user…" />
			</ViewTransition>
		</PageTransition>
	);
}
