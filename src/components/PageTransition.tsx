import type { ReactNode } from "react";

// Cross-document transitions are provided by CSS instead of React's canary-only component.
export const PageTransition = ({ children }: { children: ReactNode }) => (
	<div className="page-transition">{children}</div>
);
