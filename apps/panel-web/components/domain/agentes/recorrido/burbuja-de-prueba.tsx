"use client";

import { useState, type ReactNode } from "react";
import { MessageCircle } from "lucide-react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * «Probar el chat» por debajo de 1280 px (HU-UX-26, D-SPEC-52-3): una burbuja fija abajo a la derecha, 20 px del
 * borde y 92 px sobre el pie, que abre el celular (`children`) en un panel lateral de `min(480px, 100vw)`. El
 * panel es el `Sheet` del sistema: foco atrapado, se cierra con la ×, con Escape o tocando fuera, y el foco
 * vuelve a la burbuja. Entra deslizándose en 220 ms (sin animación con `prefers-reduced-motion`).
 *
 * Reemplaza la `HojaDeVistaPrevia` y la `FranjaDelEscenario` de la ruta. Desde 1280 px no se ve: el celular ya
 * está en su columna. Es azul sólido (`bg-action`) y no el degradado del lienzo: el blanco sobre el cian no llega
 * a AA en el tema oscuro. `conAviso` le pone un punto a la burbuja cuando el celular tiene algo que decir (la
 * última prueba de la estación 5). `enLinea` la deja en su lugar y visible en todo ancho (solo para `/catalogo`).
 */
export function BurbujaDePrueba({
  children,
  conAviso = false,
  enLinea = false,
  className,
}: {
  children: ReactNode;
  conAviso?: boolean;
  enLinea?: boolean;
  className?: string;
}) {
  const [abierta, setAbierta] = useState(false);
  return (
    <Sheet open={abierta} onOpenChange={setAbierta}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex min-h-[3.25rem] items-center gap-2.5 rounded-full bg-action pl-3.5 pr-5 text-[0.9375rem] font-semibold text-white shadow-elev-3 ring-2 ring-focus/40 transition-[filter] duration-150 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-focus motion-reduce:transition-none",
            !enLinea && "fixed bottom-[92px] right-5 z-40 xl:hidden",
            className,
          )}
        >
          <MessageCircle className="h-[1.375rem] w-[1.375rem]" aria-hidden />
          Probar el chat
          {conAviso && (
            <>
              <span aria-hidden className="h-2 w-2 rounded-full bg-white" />
              <span className="sr-only">, tiene un aviso</span>
            </>
          )}
        </button>
      </SheetTrigger>
      <SheetContent
        title="Probar el chat"
        description="Así respondería tu agente. Es una vista previa: no le escribe a nadie."
        className="sh-celular-entra top-0 [--celular-reserva:9rem] sm:max-w-[30rem] md:top-0"
      >
        {children}
      </SheetContent>
    </Sheet>
  );
}
