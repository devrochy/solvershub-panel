import type { ComponentProps, ReactNode } from "react";

import { PageHeader } from "@/components/ui/page-header";

type Cabecera = ComponentProps<typeof PageHeader>;

/**
 * Plantilla de tablero: cabecera con el selector de período en las acciones, avisos y
 * una grilla de 12 columnas en escritorio, 6 en tableta y 1 en celular (SPEC-29 §4).
 * Cada widget decide su ancho con `col-span-*`; el orden del DOM es el orden visual.
 */
export function DashboardPage({
  header,
  notices,
  children,
}: {
  header: Cabecera;
  notices?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader {...header} />
      {notices}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12">{children}</div>
    </div>
  );
}
