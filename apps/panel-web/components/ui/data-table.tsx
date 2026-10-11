import type { ReactNode } from "react";

import { ColumnInfo } from "@/components/ui/column-info";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableEnhancer } from "@/components/ui/table-enhancer";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
  className?: string;
  /** Ayuda breve de la columna: se muestra con un icono ⓘ en la cabecera. */
  info?: string;
};

/** Alto de fila por densidad (tokens `density.row-*`): cómoda 48 px, compacta 40 px. */
const CELDA = {
  comfortable: "h-12 py-3.5",
  compact: "h-10 py-2",
} as const;

/**
 * Tabla de datos genérica: recibe columnas + filas y resuelve el markup.
 * Sin estado, sin fetch, sin conocimiento del dominio (columnas vienen de fuera).
 *
 * Estados (HU-DS-03): `loading` dibuja filas esqueleto con la forma de la tabla, `error`
 * explica qué pasó (con `errorAction` para reintentar) y sin filas va el estado vacío.
 * Con `maxHeight` la tabla hace scroll propio y el encabezado queda fijo.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyTitle = "Sin registros",
  emptyDescription,
  emptyAction,
  density = "comfortable",
  loading = false,
  loadingRows = 5,
  error,
  errorAction,
  maxHeight,
  caption,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  density?: keyof typeof CELDA;
  loading?: boolean;
  loadingRows?: number;
  error?: string | null;
  errorAction?: ReactNode;
  /** Clase de alto máximo (por ejemplo `max-h-[480px]`): scroll propio y encabezado fijo. */
  maxHeight?: string;
  /** Descripción de la tabla para lectores de pantalla. */
  caption?: string;
  className?: string;
}) {
  const marco = cn("overflow-hidden rounded-lg border border-border-soft bg-surface", className);

  if (error) {
    return (
      <div role="alert" className={marco}>
        <EmptyState title="No se pudieron cargar los datos" description={error} action={errorAction} />
      </div>
    );
  }

  if (!loading && rows.length === 0) {
    return (
      <div className={marco}>
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      </div>
    );
  }

  const celda = CELDA[density];

  return (
    <div className={marco} aria-busy={loading || undefined}>
      {!loading && rows.length > 7 && <TableEnhancer />}
      <Table containerClassName={cn(maxHeight && cn(maxHeight, "overflow-y-auto"))}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <TableHeader className={cn(maxHeight && "sticky top-0 z-10 bg-surface-2")}>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(column.align === "right" && "text-right", column.className)}
              >
                {column.header}
                {column.info && <ColumnInfo text={column.info} />}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? Array.from({ length: loadingRows }, (_, i) => (
                <TableRow key={`esqueleto-${i}`} className="hover:bg-transparent">
                  {columns.map((column) => (
                    <TableCell key={column.key} className={celda}>
                      <Skeleton className={cn("h-3", column.align === "right" ? "ml-auto w-16" : "w-3/4")} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : rows.map((row, index) => (
                <TableRow key={getRowKey(row, index)}>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        celda,
                        density === "compact" && "text-sh-dense",
                        column.align === "right" && "text-right tabular-nums",
                        column.className,
                      )}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}
