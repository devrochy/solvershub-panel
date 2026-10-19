"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";

/**
 * Ayuda en contexto accesible (HU-UX-03): se muestra al pasar el mouse, al
 * enfocar con teclado (`focus`) y al tocar en el celular (`onClick`), no solo
 * con `title`. El contenido es un `role="tooltip"` asociado por `aria-describedby`.
 *
 * Va en un portal (HU-UX-12): un `overflow` del contenedor (la barra plegada, el marco
 * de una tabla) ya no lo recorta. Escape o un toque fuera lo cierran. El disparador
 * lleva `data-tooltip`, así que un clic en él no ordena la columna de una cabecera.
 *
 * Con `focusable={false}` el hijo ya es enfocable y ya tiene nombre (`aria-label`): la
 * etiqueta es solo visual, sin un segundo tab stop ni descripción repetida.
 */
export function Tooltip({
  label,
  children,
  side = "top",
  focusable = true,
  className,
}: {
  label: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  focusable?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const disparador = useRef<HTMLSpanElement>(null);
  const dentroDelDisparador = (target: EventTarget | null) =>
    target instanceof Node && Boolean(disparador.current?.contains(target));

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Anchor asChild>
        <span
          ref={disparador}
          data-tooltip=""
          aria-describedby={focusable && open ? id : undefined}
          tabIndex={focusable ? 0 : undefined}
          className={cn("inline-flex", className)}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onClick={() => setOpen(true)}
        >
          {children}
        </span>
      </PopoverPrimitive.Anchor>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          id={id}
          role="tooltip"
          aria-hidden={focusable ? undefined : true}
          side={side}
          sideOffset={6}
          collisionPadding={8}
          // Es un tooltip, no un diálogo: el foco se queda en el disparador.
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          // Tocar el propio disparador no lo cierra (el clic lo vuelve a abrir).
          onPointerDownOutside={(e) => dentroDelDisparador(e.target) && e.preventDefault()}
          onFocusOutside={(e) => dentroDelDisparador(e.target) && e.preventDefault()}
          className="pointer-events-none z-50 w-max max-w-[260px] rounded-md border border-border-soft bg-surface px-3 py-2 text-xs text-body shadow-elev-2"
        >
          {label}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
