import type { ComponentProps, ReactNode } from "react";

import { PageHeader } from "@/components/ui/page-header";

type Cabecera = ComponentProps<typeof PageHeader>;

/**
 * Plantilla de detalle (cartera, cliente, conversación): cabecera con migas, un resumen
 * arriba (KPIs o datos clave) y el contenido, normalmente en pestañas.
 */
export function DetailPage({
  header,
  summary,
  children,
}: {
  header: Cabecera;
  summary?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader {...header} />
      {summary && <section aria-label="Resumen">{summary}</section>}
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}
