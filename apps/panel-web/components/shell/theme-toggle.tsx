"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";

import { THEME_COOKIE, toggleTheme, type ThemeName } from "@/lib/theme";

/** Cambia el tema sin recargar: actualiza data-theme y persiste en cookie. */
export function ThemeToggle({ initialTheme }: { initialTheme: ThemeName }) {
  const [theme, setTheme] = useState<ThemeName>(initialTheme);

  function onToggle() {
    const next = toggleTheme(theme);
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={theme === "sh-dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      className="rounded-md p-2 text-text-soft transition-colors duration-150 hover:bg-hover hover:text-headline"
    >
      {theme === "sh-dark" ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
