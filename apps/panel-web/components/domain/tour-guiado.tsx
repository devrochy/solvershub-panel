"use client";

import { useEffect, useId, useState, type KeyboardEvent } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { Button } from "@/components/ui/button";
import {
  PASOS_DEL_TOUR,
  anuncioDelPaso,
  pasoAnterior,
  pasoSiguiente,
  type FinDelTour,
  type PasoDelTour,
} from "@/lib/tour";
import { cn } from "@/lib/utils";

/** Resalta el elemento visible con `data-tour=<objetivo>` mientras dura el paso. */
function useResaltado(objetivo: string | null) {
  useEffect(() => {
    if (!objetivo) return;
    const candidatos = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${objetivo}"]`));
    const visible = candidatos.find((el) => el.getClientRects().length > 0);
    if (!visible) return; // sin permiso o en el menú del celular: el paso se lee igual
    visible.setAttribute("data-tour-activo", "true");
    const reducido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    visible.scrollIntoView?.({ block: "nearest", behavior: reducido ? "auto" : "smooth" });
    return () => visible.removeAttribute("data-tour-activo");
  }, [objetivo]);
}

/**
 * Recorrido guiado de 5 pasos (HU-SH-06; D-SPEC-12-1 = A, sin librerías). Se monta abierto y
 * avisa cómo terminó (`completado` o `saltado`); quien lo monta lo desmonta.
 *
 * Teclado: Tab recorre los botones (el foco queda dentro), ← y → cambian de paso, Escape lo
 * salta. Cada cambio se anuncia al lector de pantalla y, al cerrar, el foco vuelve a quien lo
 * abrió. Sin fondo oscuro: el elemento resaltado tiene que verse.
 */
export function TourGuiado({
  onTerminar,
  pasos = PASOS_DEL_TOUR,
  respaldoDelFoco,
}: {
  onTerminar: (fin: FinDelTour) => void;
  pasos?: readonly PasoDelTour[];
  /** Id del elemento que recibe el foco al cerrar si quien lo abrió ya no está en la página. */
  respaldoDelFoco?: string;
}) {
  const [indice, setIndice] = useState(0);
  // Quién tenía el foco al abrir: se abre por código (sin `Trigger`), así que se devuelve a mano.
  const [volverA] = useState<HTMLElement | null>(() =>
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );
  const textoId = useId();
  const paso = pasos[indice];
  const ultimo = indice === pasos.length - 1;
  useResaltado(paso?.objetivo ?? null);

  if (!paso) return null;

  function siguiente() {
    const proximo = pasoSiguiente(indice, pasos.length);
    if (proximo === null) onTerminar("completado");
    else setIndice(proximo);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      siguiente();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setIndice(pasoAnterior(indice));
    }
  }

  return (
    <DialogPrimitive.Root open onOpenChange={(abierto) => !abierto && onTerminar("saltado")}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby={textoId}
          onKeyDown={onKeyDown}
          // El recorrido no se cierra por un clic suelto fuera: se salta a propósito.
          onPointerDownOutside={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => {
            const destino = volverA?.isConnected
              ? volverA
              : respaldoDelFoco
                ? document.getElementById(respaldoDelFoco)
                : null;
            if (destino) {
              event.preventDefault();
              destino.focus();
            }
          }}
          className={cn(
            "fixed inset-x-4 bottom-4 z-50 rounded-lg border border-border bg-surface p-5 shadow-lg focus:outline-none",
            "sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[22rem]",
            "transition-opacity duration-150 ease-out motion-reduce:transition-none",
          )}
        >
          <p className="text-xs font-medium text-text-soft" aria-hidden>
            Paso {indice + 1} de {pasos.length}
          </p>
          <DialogPrimitive.Title className="mt-1 font-display text-base font-semibold text-headline">
            {paso.titulo}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description id={textoId} className="mt-2 text-sm leading-6 text-body">
            {paso.texto}
          </DialogPrimitive.Description>
          <p className="sr-only" role="status" aria-live="polite">
            {anuncioDelPaso(indice, pasos.length, paso.titulo)}
          </p>
          <div className="mt-5 flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => onTerminar("saltado")}>
              Saltar recorrido
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setIndice(pasoAnterior(indice))}
                disabled={indice === 0}
              >
                Anterior
              </Button>
              <Button size="sm" type="button" onClick={siguiente} autoFocus>
                {ultimo ? "Terminar" : "Siguiente"}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
