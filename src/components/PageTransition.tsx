import { type Key, type ReactNode, ViewTransition } from "react";

interface PageTransitionProps {
	children: ReactNode;
	transitionKey?: Key;
}

export const PageTransition = ({ children, transitionKey }: PageTransitionProps) => (
	<ViewTransition key={transitionKey} enter="fade-in" exit="fade-out" default="none">
		{children}
	</ViewTransition>
);
