"use client";

import { useState } from "react";

import { ThemeSwitch } from "@/components/ui/theme-switch";
import { THEME_COOKIE, type ThemeName } from "@/lib/theme";

/**
 * Cambio de tema en las pantallas sin sesión. El tema inicial lo resuelve el servidor
 * desde la cookie `panel_theme`; aquí solo se aplica al documento y se guarda para la
 * siguiente visita, igual que en la tarjeta de la cuenta.
 */
export function TemaDeAcceso({ inicial }: { inicial: ThemeName }) {
  const [tema, setTema] = useState<ThemeName>(inicial);

  function aplicar(next: ThemeName) {
    setTema(next);
    document.documentElement.dataset.theme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <div className="flex items-center gap-2 text-sh-caption text-text-soft">
      <span>Tema</span>
      <ThemeSwitch
        oscuro={tema === "sh-dark"}
        onChange={(oscuro) => aplicar(oscuro ? "sh-dark" : "sh-light")}
      />
    </div>
  );
}
