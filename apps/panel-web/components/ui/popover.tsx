"use client";

import type { ReactNode } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;

/** Panel flotante para contenido interactivo (filtros, ayudas largas). Escape lo cierra. */
export function PopoverContent({
  children,
  side = "bottom",
  align = "start",
  label,
  className,
}: {
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  /** Nombre accesible del panel. */
  label: string;
  className?: string;
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        aria-label={label}
        side={side}
        align={align}
        sideOffset={6}
        className={cn(
          "z-50 w-72 rounded-md border border-border bg-surface p-4 text-sm text-headline shadow-elev-2 focus:outline-none",
          className,
        )}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}
