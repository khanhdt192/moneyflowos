const LIGHT_THEME_COLOR = "#f8fafc";
const DARK_THEME_COLOR = "#0f172a";

export function syncThemeColorMeta(isDark: boolean) {
  const content = isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"][data-runtime="app"]');

  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.dataset.runtime = "app";
    document.head.appendChild(meta);
  }

  meta.content = content;
}

export function getPreferredThemeMode(): boolean {
  const saved = localStorage.getItem("theme");
  if (saved) return saved === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyThemeMode(isDark: boolean): void {
  document.documentElement.classList.toggle("dark", isDark);
  syncThemeColorMeta(isDark);
}
