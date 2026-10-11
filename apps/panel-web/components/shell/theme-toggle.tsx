"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { EVENTO_CAMBIAR_TEMA } from "@/components/shell/atajos-context";
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

  // La paleta de comandos (HU-DS-05) también cambia el tema.
  const alPedirlo = useEffectEvent(onToggle);
  useEffect(() => {
    window.addEventListener(EVENTO_CAMBIAR_TEMA, alPedirlo);
    return () => window.removeEventListener(EVENTO_CAMBIAR_TEMA, alPedirlo);
  }, []);

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
