"use client";

import { useEffect, useState } from "react";
import { getThemeColor, THEME_STORAGE_KEY, THEMES, type Theme } from "~/lib/theme";
import { runViewTransition } from "~/lib/view-transition";
import { MoonIcon } from "./icons/MoonIcon";
import { PaperAirplaneIcon } from "./icons/PaperAirplaneIcon";
import { SunIcon } from "./icons/SunIcon";

const iconClass =
	"inline-flex size-9 shrink-0 items-center justify-center rounded leading-none transition-colors hover:bg-black hover:text-white focus-visible:outline-2 motion-reduce:transition-none dark:hover:bg-white dark:hover:text-black";

const applyTheme = (theme: Theme) => {
	document.documentElement.classList.toggle("dark", theme === THEMES.DARK);
	document.documentElement.dataset.theme = theme;
	document
		.querySelector('meta[name="theme-color"]')
		?.setAttribute("content", getThemeColor(theme));
};

const persistTheme = (theme: Theme) => {
	try {
		localStorage.setItem(THEME_STORAGE_KEY, theme);
	} catch {
		// The selected theme still applies for this page when storage is unavailable.
	}
};

export function ShareButton() {
	const [canShare, setCanShare] = useState(false);

	useEffect(() => {
		setCanShare(typeof navigator.share === "function");
	}, []);

	if (!canShare) return null;

	const sharePage = async () => {
		try {
			await navigator.share({ title: document.title, url: window.location.href });
		} catch {
			// Sharing can be unavailable or dismissed after capability detection.
		}
	};

	return (
		<button
			aria-label="Share page"
			className={iconClass}
			onClick={() => void sharePage()}
			title="Share page"
		>
			<PaperAirplaneIcon className="size-6 shrink-0" />
		</button>
	);
}

export function ThemeToggle() {
	const toggleTheme = () => {
		const theme = document.documentElement.classList.contains("dark")
			? THEMES.LIGHT
			: THEMES.DARK;
		runViewTransition(() => {
			applyTheme(theme);
			persistTheme(theme);
		});
	};

	return (
		<button
			aria-label="Toggle theme"
			className={iconClass}
			onClick={toggleTheme}
			title="Toggle theme"
		>
			<SunIcon className="size-6 shrink-0 dark:hidden" />
			<MoonIcon className="hidden size-6 shrink-0 dark:block" />
		</button>
	);
}
