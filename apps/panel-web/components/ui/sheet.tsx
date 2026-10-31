"use client";

import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

/**
 * Panel lateral para ver o editar un detalle sin salir de la lista. Mismo comportamiento
 * que el diálogo (foco atrapado, Escape, foco devuelto), pegado al borde derecho y a
 * pantalla completa en celular.
 */
export function SheetContent({
  title,
  description,
  children,
  footer,
  hero,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Contenido fijo entre el encabezado y el área desplazable (p. ej. avatar + pestañas). */
  hero?: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-surface shadow-elev-3 focus:outline-none sm:max-w-md",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-soft p-5">
          <div>
            <DialogPrimitive.Title className="font-display text-sh-block text-headline">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-sm text-body">{description}</DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close
            aria-label="Cerrar"
            className="rounded-md p-1 text-text-soft transition-colors hover:bg-hover hover:text-headline"
          >
            <X className="h-4 w-4" aria-hidden />
          </DialogPrimitive.Close>
        </div>
        {hero ? <div className="shrink-0 px-5 pt-5">{hero}</div> : null}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border-soft p-4">{footer}</div>}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
