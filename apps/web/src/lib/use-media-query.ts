import { useSyncExternalStore } from "react";

/** Live result of a CSS media query. Where matchMedia is missing (tests, old browsers) returns `fallback`. */
export function useMediaQuery(query: string, fallback = true): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : fallback),
    () => fallback,
  );
}

/** Tables and side panels from md (768px) up; cards and bottom sheets below. */
export const useIsDesktop = () => useMediaQuery("(min-width: 768px)");
/** The full sidebar shell from lg (1024px) up. */
export const useIsWide = () => useMediaQuery("(min-width: 1024px)");
