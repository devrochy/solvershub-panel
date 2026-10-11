"use client";

import { Search } from "lucide-react";

import { useAtajos } from "@/components/shell/atajos-context";
import { useEsMac } from "@/components/shell/use-es-mac";
import { Kbd } from "@/components/ui/kbd";

/**
 * Abre la paleta de comandos desde la barra superior (HU-DS-05). En celular es solo el
 * ícono; desde 1024 px muestra el texto y el atajo, para que se descubra.
 */
export function BotonBuscar() {
  const atajos = useAtajos();
  const esMac = useEsMac();
  if (!atajos) return null;

  return (
    <button
      type="button"
      onClick={atajos.abrirPaleta}
      aria-label="Buscar o ir a una sección"
      aria-keyshortcuts={esMac ? "Meta+K" : "Control+K"}
      aria-haspopup="dialog"
      className="flex h-9 shrink-0 items-center gap-2 rounded-md p-2 text-text-soft transition-colors duration-150 hover:bg-hover hover:text-headline lg:w-56 lg:border lg:border-control-border lg:px-3"
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden />
      <span className="hidden flex-1 text-left text-sh-dense lg:inline">Buscar…</span>
      <Kbd keys={[esMac ? "⌘" : "Ctrl", "K"]} className="hidden lg:inline-flex" />
    </button>
  );
}
