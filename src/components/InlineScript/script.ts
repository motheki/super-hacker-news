import { DEFAULT_THEME, THEMES, THEME_STORAGE_KEY, type Theme, getThemeColor } from "~/lib/theme";

if (!("share" in navigator)) {
	document.body.classList.add("noshare");
}

const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");

const getStoredTheme = (): Theme | null => {
	const theme = localStorage.getItem(THEME_STORAGE_KEY);
	return theme === THEMES.LIGHT || theme === THEMES.DARK ? theme : null;
};

const getSystemTheme = (): Theme => (colorSchemeQuery.matches ? THEMES.DARK : DEFAULT_THEME);

const getTheme = (): Theme => getStoredTheme() ?? getSystemTheme();

const applyTheme = (theme: Theme) => {
	document.documentElement.classList.toggle("dark", theme === THEMES.DARK);
	document
		.querySelector('meta[name="theme-color"]')
		?.setAttribute("content", getThemeColor(theme));
};

const setTheme = (theme: Theme) => {
	applyTheme(theme);
	localStorage.setItem(THEME_STORAGE_KEY, theme);
};

declare global {
	interface Window {
		UI: {
			switchTheme(): void;
			updateTheme(): void;
		};
	}
}

window.UI = {
	switchTheme() {
		const newTheme: Theme = document.documentElement.classList.contains("dark")
			? THEMES.LIGHT
			: THEMES.DARK;

		setTheme(newTheme);
	},

	updateTheme() {
		applyTheme(getTheme());
	},
};

colorSchemeQuery.addEventListener("change", () => {
	if (getStoredTheme() === null) {
		applyTheme(getSystemTheme());
	}
});

window.UI.updateTheme();
