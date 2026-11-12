"use client";

import { Search } from "lucide-react";

import { useAtajos } from "@/components/shell/atajos-context";
import { useEsMac } from "@/components/shell/use-es-mac";
import { Kbd } from "@/components/ui/kbd";

/**
 * Abre la paleta de comandos desde la barra superior (HU-DS-05). En celular es solo el
 * ícono; desde `md` ocupa el centro de la barra y el texto se recorta en una sola línea.
 * El atajo se muestra desde `xl`, cuando hay ancho para él.
 */
export function BotonBuscar() {
  const atajos = useAtajos();
  const esMac = useEsMac();
  if (!atajos) return null;

  return (
    <button
      type="button"
      onClick={atajos.abrirPaleta}
      aria-label="Buscar en el panel o ir a una sección"
      aria-keyshortcuts={esMac ? "Meta+K" : "Control+K"}
      aria-haspopup="dialog"
      className="flex h-9 w-9 min-w-0 shrink-0 items-center justify-center gap-2 rounded-md p-2 text-text-soft transition-colors duration-150 hover:bg-hover hover:text-headline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus md:w-full md:max-w-[22rem] md:justify-start md:border md:border-control-border md:bg-bg-deep md:px-3"
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden />
      <span className="hidden min-w-0 flex-1 truncate whitespace-nowrap text-left text-sh-dense md:inline">
        Buscar o ir a…
      </span>
      <Kbd keys={[esMac ? "⌘" : "Ctrl", "K"]} className="hidden shrink-0 xl:inline-flex" />
    </button>
  );
}
