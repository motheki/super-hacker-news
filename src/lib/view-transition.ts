"use client";

export const prefersReducedMotion = () =>
	window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const runViewTransition = (update: () => void) => {
	if (prefersReducedMotion() || !document.startViewTransition) {
		update();
		return;
	}

	document.startViewTransition(update);
};
