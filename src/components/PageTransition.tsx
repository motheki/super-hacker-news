import { type Key, type ReactNode, ViewTransition } from "react";

const directionalClasses = {
	"nav-forward": "nav-forward",
	"nav-back": "nav-back",
	default: "none",
} as const;

const sharedClasses = {
	...directionalClasses,
	"topic-change": "morph",
} as const;

interface PageTransitionProps {
	children: ReactNode;
	transitionKey?: Key;
}

export const PageTransition = ({ children, transitionKey }: PageTransitionProps) => (
	<ViewTransition
		key={transitionKey}
		name="route-page"
		enter={directionalClasses}
		exit={directionalClasses}
		share={sharedClasses}
		default="none"
	>
		{children}
	</ViewTransition>
);
