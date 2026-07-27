export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'gxa_theme';

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark';

export function getInitialTheme(): Theme {
  if (typeof document !== 'undefined') {
    const bootTheme = document.documentElement.dataset.theme;
    if (isTheme(bootTheme)) return bootTheme;
  }

  if (typeof window !== 'undefined') {
    try {
      const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (isTheme(storedTheme)) return storedTheme;
    } catch {
      // Storage can be unavailable in private or embedded browser contexts.
    }

    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  }

  return 'light';
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The active theme still applies even when preference storage is unavailable.
  }
}
