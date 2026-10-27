import type { ReactNode } from "react";

import { SectionHelpButton } from "@/app/(app)/_components/section-help-button";
import { MigasDeShell, PestanasDeShell } from "@/components/shell/navegacion-de-pagina";
import { Breadcrumbs, type Miga } from "@/components/ui/breadcrumbs";
import { cn } from "@/lib/utils";

/**
 * Cabecera de página: migas + título + descripción + acciones, y debajo las pestañas de
 * la sección si las hay. Único lugar para el H1.
 */
export function PageHeader({
  title,
  description,
  actions,
  helpSection,
  breadcrumbs,
  migasIntermedias,
  tabs,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Clave de `lib/copy.ts` para el "¿Qué es esto?". Opcional. */
  helpSection?: string;
  /** Migas propias. Sin esta prop salen solas del menú y la ruta (HU-DS-04). */
  breadcrumbs?: Miga[];
  /** Padres de datos entre la pestaña y el título (la cartera de un cliente). */
  migasIntermedias?: Miga[];
  /** Pestañas propias. Sin esta prop, las de la sección del pack salen solas (HU-DS-04). */
  tabs?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {breadcrumbs ? breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} /> : <MigasDeShell titulo={title} intermedias={migasIntermedias} />}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-sh-h1 tracking-tight text-headline">{title}</h1>
            {helpSection && <SectionHelpButton section={helpSection} />}
          </div>
          {description && <p className="mt-1 max-w-2xl text-sm text-body">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {tabs ?? <PestanasDeShell />}
    </div>
  );
}
