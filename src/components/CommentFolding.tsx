"use client";

import { useEffect } from "react";
import { runViewTransition } from "~/lib/view-transition";

export const CommentFolding = ({ containerId }: { containerId: string }) => {
	useEffect(() => {
		const container = document.getElementById(containerId);
		if (!container) return;

		const toggleComment = (event: MouseEvent) => {
			if (!(event.target instanceof Element)) return;
			const button = event.target.closest<HTMLButtonElement>("button[data-comment-toggle]");
			if (!button || !container.contains(button)) return;

			const commentId = button.dataset.commentToggle;
			const article = button.closest<HTMLElement>("[data-comment-id]");
			const details = document.getElementById(`comment-details-${commentId}`);
			if (!commentId || !article || !details || !article.contains(details)) return;

			const fold = button.getAttribute("aria-expanded") === "true";
			runViewTransition(() => {
				details.hidden = fold;
				if (fold) article.dataset.folded = "true";
				else delete article.dataset.folded;

				for (const toggle of article.querySelectorAll<HTMLButtonElement>(
					`button[data-comment-toggle="${commentId}"]`,
				)) {
					toggle.setAttribute("aria-expanded", String(!fold));
				}

				const summary = article.querySelector<HTMLElement>(
					`[data-comment-summary="${commentId}"]`,
				);
				if (summary) {
					summary.textContent = fold
						? `[${Number(article.dataset.commentsCount ?? "0") + 1} more]`
						: "[–]";
				}
			});

			document.getElementById(`comment-info-${commentId}`)?.scrollIntoView({
				block: "nearest",
			});
		};

		container.addEventListener("click", toggleComment);
		return () => container.removeEventListener("click", toggleComment);
	}, [containerId]);

	return null;
};
