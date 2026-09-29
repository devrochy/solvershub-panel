import { Info } from "lucide-react";

/** Icono informativo para cabeceras de columna: aclara qué es el campo. */
export function ColumnInfo({ text }: { text: string }) {
  return (
    <span
      aria-label={text}
      className="ml-1 inline-flex cursor-help align-middle text-text-soft transition-colors hover:text-body focus:text-body"
      role="img"
      tabIndex={0}
      title={text}
    >
      <Info className="h-3.5 w-3.5" aria-hidden />
    </span>
  );
}
