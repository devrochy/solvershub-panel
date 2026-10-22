"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { Sidebar, type PackState } from "@/components/shell/sidebar";
import type { Me } from "@/lib/api/types";
import { DEFAULT_THEME, type ThemeName } from "@/lib/theme";

/**
 * Menú del panel en celular (< md): la barra lateral no cabe al lado del contenido,
 * así que se abre como panel deslizante desde un botón de la barra superior. Se cierra
 * al elegir una sección, con Escape o tocando fuera.
 */
export function MobileNav({
  me,
  packs,
  initialTheme = DEFAULT_THEME,
}: {
  me: Me;
  packs: Record<string, PackState>;
  initialTheme?: ThemeName;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    // Sin scroll del fondo mientras el menú está abierto.
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previo;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Abrir menú"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="-ml-2 rounded-md p-2 text-body hover:bg-hover hover:text-headline md:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Menú del panel" className="fixed inset-0 z-50 md:hidden">
          <div
            data-testid="mobile-nav-fondo"
            aria-hidden
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex h-full w-72 max-w-[85vw]">
            <Sidebar
              me={me}
              packs={packs}
              initialTheme={initialTheme}
              className="h-full w-full"
              onNavigate={() => setOpen(false)}
            />
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-3 rounded-md p-1.5 text-text-soft hover:text-headline"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
