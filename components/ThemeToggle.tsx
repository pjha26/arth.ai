"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

const subscribe = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const dark = mounted && resolvedTheme === "dark";

  return (
    <button type="button" className="ui-theme" aria-label="Dark mode" aria-pressed={dark} disabled={!mounted}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(dark ? "light" : "dark")}>
      <span data-active={mounted && !dark ? "true" : undefined}>Light</span>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        {dark
          ? <path d="M20.7 15.1A8.9 8.9 0 0 1 8.9 3.3 9 9 0 1 0 20.7 15.1Z" />
          : <><circle cx="12" cy="12" r="4" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2" /></>}
      </svg>
      <span data-active={dark ? "true" : undefined}>Dark</span>
    </button>
  );
}
