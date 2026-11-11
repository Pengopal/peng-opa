export type ThemeChoice = "light" | "dark" | "system";
const KEY = "peng-opa.theme";

export function readTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

/** Light-first; "system" follows the OS. Stored per browser. */
export function applyTheme(choice: ThemeChoice) {
  const dark = choice === "dark" || (choice === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", !!dark);
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    /* not remembered */
  }
}
