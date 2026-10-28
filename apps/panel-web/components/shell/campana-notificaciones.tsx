"use client";

import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Bell, X } from "lucide-react";

import { CentroDeNotificaciones } from "@/components/notificaciones/centro-de-notificaciones";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotificaciones } from "@/lib/notificaciones/use-notificaciones";
import { cn } from "@/lib/utils";

/** Debajo de `md` (768 px) el centro es una hoja a pantalla casi completa; desde ahí, un popover. */
function useEsPantallaChica() {
  const [chica, setChica] = useState(false);
  useEffect(() => {
    const consulta = window.matchMedia("(max-width: 767px)");
    const actualizar = () => setChica(consulta.matches);
    actualizar();
    consulta.addEventListener("change", actualizar);
    return () => consulta.removeEventListener("change", actualizar);
  }, []);
  return chica;
}

/** Texto del contador: tope `99+`. */
export function textoDelContador(n: number): string {
  return n > 99 ? "99+" : String(n);
}

/**
 * Campana del centro de notificaciones (ADR-0167): siempre en la barra superior, a la derecha.
 * Muestra el contador de no leídas y abre el centro con una entrada/salida animada
 * (`sh-notif-*` en globals.css, que respeta `prefers-reduced-motion`).
 */
export function CampanaNotificaciones({ className }: { className?: string }) {
  const [abierto, setAbierto] = useState(false);
  const chica = useEsPantallaChica();
  const n = useNotificaciones({ abierto });

  const etiqueta = n.noLeidas > 0 ? `Notificaciones, ${textoDelContador(n.noLeidas)} sin leer` : "Notificaciones";
  const boton = (
    <button
      type="button"
      aria-label={etiqueta}
      aria-haspopup="dialog"
      aria-expanded={abierto}
      className={cn(
        "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-soft transition-colors duration-150 hover:bg-hover hover:text-headline focus-visible:outline-2 focus-visible:outline-focus",
        abierto && "bg-hover text-headline",
        className,
      )}
    >
      <Bell className="h-5 w-5" aria-hidden />
      {n.noLeidas > 0 && (
        <span
          // `key`: al cambiar el número el globo hace un «pop» corto (un cambio de estado).
          key={n.noLeidas}
          aria-hidden
          className="sh-notif-globo absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-danger-strong px-1 text-[10px] font-semibold leading-none text-white"
        >
          {textoDelContador(n.noLeidas)}
        </span>
      )}
    </button>
  );

  const centro = <CentroDeNotificaciones n={n} onCerrar={() => setAbierto(false)} />;

  if (chica) {
    return (
      <DialogPrimitive.Root open={abierto} onOpenChange={setAbierto}>
        <DialogPrimitive.Trigger asChild>{boton}</DialogPrimitive.Trigger>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="sh-notif-overlay fixed inset-0 z-50 bg-overlay" />
          <DialogPrimitive.Content className="sh-notif-hoja fixed inset-x-0 bottom-0 top-12 z-50 flex flex-col rounded-t-lg border border-border bg-surface shadow-elev-3 focus:outline-none">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border-soft px-4 py-3">
              <DialogPrimitive.Title className="font-display text-sh-block text-headline">Notificaciones</DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">
                Avisos de tu negocio: escalaciones, ventas, cobros, agenda y sistema.
              </DialogPrimitive.Description>
              <DialogPrimitive.Close
                aria-label="Cerrar"
                className="flex h-9 w-9 items-center justify-center rounded-md text-text-soft transition-colors hover:bg-hover hover:text-headline"
              >
                <X className="h-4 w-4" aria-hidden />
              </DialogPrimitive.Close>
            </div>
            {centro}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>{boton}</PopoverTrigger>
      <PopoverContent
        label="Notificaciones"
        align="end"
        className="sh-notif-popover flex max-h-[min(36rem,calc(100vh-5rem))] w-[26rem] flex-col p-0"
      >
        <div className="shrink-0 border-b border-border-soft px-4 py-3">
          <h2 className="font-display text-sh-block text-headline">Notificaciones</h2>
        </div>
        {centro}
      </PopoverContent>
    </Popover>
  );
}
