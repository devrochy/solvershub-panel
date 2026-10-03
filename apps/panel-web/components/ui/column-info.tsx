"use client";

import { Info } from "lucide-react";

import { Tooltip } from "@/components/ui/tooltip";

/** Icono informativo para cabeceras de columna: aclara qué es el campo.
 * Accesible por teclado y táctil (HU-UX-03), no solo con `title`. */
export function ColumnInfo({ text }: { text: string }) {
  return (
    <Tooltip label={text}>
      <span
        aria-label={text}
        className="ml-1 cursor-help align-middle text-text-soft transition-colors hover:text-body focus:text-body"
        role="img"
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </span>
    </Tooltip>
  );
}
