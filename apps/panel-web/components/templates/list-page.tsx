import type { ComponentProps, ReactNode } from "react";

import { PageHeader } from "@/components/ui/page-header";

type Cabecera = ComponentProps<typeof PageHeader>;

/**
 * Plantilla de lista: cabecera, barra de filtros y el contenido (tabla y paginación).
 * Fija el ritmo vertical de DESIGN.md (24 px entre bloques) para que todas las listas
 * se vean igual.
 */
export function ListPage({
  header,
  filters,
  children,
}: {
  header: Cabecera;
  filters?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader {...header} />
      {filters && <div className="flex flex-wrap items-end gap-3">{filters}</div>}
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}
