export type ThemeChoice = "light" | "dark" | "system";
const KEY = "peng-opa.theme-choice";

export function readTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "dark" || v === "system" ? v : "light";
  } catch {
    return "light";
  }
}

/** Light by default; "dark" and "system" are opt-in. Stored per browser. */
export function applyTheme(choice: ThemeChoice, remember = false) {
  const dark = choice === "dark" || (choice === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", !!dark);
  if (!remember) return;
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    /* not remembered */
  }
}
