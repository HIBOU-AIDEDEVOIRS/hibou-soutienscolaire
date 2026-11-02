export type Theme = "dark" | "light";
const KEY = "hibou-theme";

export const themeInitScript = `(function(){try{var t=localStorage.getItem('${KEY}')||'dark';if(t==='dark')document.documentElement.classList.add('dark');}catch(e){document.documentElement.classList.add('dark');}})();`;

export function applyTheme(t: Theme) {
  document.documentElement.classList.toggle("dark", t === "dark");
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* ignore */
  }
}

export function currentTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}
