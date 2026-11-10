import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";

import { DataTable } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";

export type FilaCelular = {
  titulo: ReactNode;
  detalle?: ReactNode;
  /** A la izquierda del título: la posición en la ruta, un avatar. */
  inicio?: ReactNode;
  /** A la derecha, el dato que se compara entre filas. */
  fin?: ReactNode;
  /** Lo que se opera dentro de la fila; va por encima del enlace. */
  accion?: ReactNode;
  href?: string;
};

/**
 * Tabla en escritorio y filas de un toque en el celular, donde una tabla ancha se saldría de la
 * pantalla. Sin filas, la tabla dibuja su estado vacío en ambos.
 */
export function TablaResponsiva<T>({
  etiqueta,
  filaCelular,
  className,
  ...tabla
}: ComponentProps<typeof DataTable<T>> & { etiqueta: string; filaCelular: (fila: T) => FilaCelular }) {
  if (tabla.rows.length === 0) return <DataTable {...tabla} className={className} />;
  return (
    <>
      <DataTable {...tabla} className={cn("max-md:hidden", className)} />
      <ul aria-label={etiqueta} className="overflow-hidden rounded-lg border border-border-soft bg-surface md:hidden">
        {tabla.rows.map((row, index) => {
          const fila = filaCelular(row);
          return (
            <li
              key={tabla.getRowKey(row, index)}
              className="relative flex min-h-18 items-center gap-3 border-b border-border-soft px-4 py-3 last:border-b-0"
            >
              {fila.inicio}
              <div className="flex min-w-0 flex-1 flex-col">
                {fila.href ? (
                  <Link
                    href={fila.href}
                    scroll={tabla.scrollAlAbrir === false ? false : undefined}
                    className="truncate text-sm font-medium text-headline outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-focus"
                  >
                    {fila.titulo}
                  </Link>
                ) : (
                  <span className="truncate text-sm font-medium text-headline">{fila.titulo}</span>
                )}
                {fila.detalle && <span className="text-xs text-text-soft">{fila.detalle}</span>}
              </div>
              {fila.fin && <span className="shrink-0 text-sm font-medium tabular-nums text-headline">{fila.fin}</span>}
              {fila.accion && <div className="relative z-10 shrink-0">{fila.accion}</div>}
            </li>
          );
        })}
      </ul>
    </>
  );
}
