import type { ReactNode } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
  className?: string;
};

/**
 * Tabla de datos genérica: recibe columnas + filas y resuelve el markup.
 * Sin estado, sin fetch, sin conocimiento del dominio (columnas vienen de fuera).
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyTitle = "Sin registros",
  emptyDescription,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border-soft bg-surface">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border-soft bg-surface", className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(column.align === "right" && "text-right", column.className)}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={getRowKey(row, index)}>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={cn(column.align === "right" && "text-right", column.className)}
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
