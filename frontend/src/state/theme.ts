export type ThemeChoice = "theme-1" | "green-review";

export const themeStorageKey = "crystal-shop-theme";
const legacyThemeMap: Record<string, ThemeChoice> = {
  "theme-2": "green-review",
};

export const themeOptions: Array<{
  value: ThemeChoice;
  label: string;
  description: string;
}> = [
  {
    value: "theme-1",
    label: "Theme 1",
    description: "Original blue workspace",
  },
  {
    value: "green-review",
    label: "Green review",
    description: "Client-requested green workspace",
  },
];

export function isThemeChoice(value: string | null): value is ThemeChoice {
  return value === "theme-1" || value === "green-review";
}

export function getStoredTheme(): ThemeChoice {
  if (typeof window === "undefined") return "theme-1";
  const storedTheme = window.localStorage.getItem(themeStorageKey);
  if (storedTheme && legacyThemeMap[storedTheme]) return legacyThemeMap[storedTheme];
  return isThemeChoice(storedTheme) ? storedTheme : "theme-1";
}

export function persistTheme(theme: ThemeChoice) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(themeStorageKey, theme);
}
