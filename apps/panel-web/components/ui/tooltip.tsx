"use client";

import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Ayuda en contexto accesible (HU-UX-03): se muestra al pasar el mouse, al
 * enfocar con teclado (`focus`) y al tocar en el celular (`onClick`), no solo
 * con `title`. El contenido es un `role="tooltip"` asociado por `aria-describedby`.
 */
export function Tooltip({
  label,
  children,
  side = "top",
  className,
}: {
  label: string;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen((v) => !v)}
    >
      <span aria-describedby={open ? id : undefined} tabIndex={0} className="inline-flex">
        {children}
      </span>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            "absolute z-50 w-max max-w-[260px] rounded-md border border-border-soft bg-surface px-3 py-2 text-xs text-body shadow-lg",
            side === "top" ? "bottom-full left-1/2 mb-2 -translate-x-1/2" : "top-full left-1/2 mt-2 -translate-x-1/2",
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}
