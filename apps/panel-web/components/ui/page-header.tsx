import type { ReactNode } from "react";

import { SectionHelpButton, SectionHelpPopover } from "@/app/(app)/_components/section-help-button";
import { MigasDeShell, PestanasDeShell } from "@/components/shell/navegacion-de-pagina";
import { TituloDePagina } from "@/components/shell/titulo-de-pagina";
import { Breadcrumbs, type Miga } from "@/components/ui/breadcrumbs";
import { cn } from "@/lib/utils";

/**
 * Cabecera de página: migas + título + descripción + acciones, y debajo las pestañas de
 * la sección si las hay. Único lugar para el H1.
 *
 * `densidad="compacta"` es para herramientas de pantalla completa (Conversaciones): título y
 * pestañas en una franja y la descripción dentro de «¿Qué es esto?».
 */
export function PageHeader({
  title,
  description,
  actions,
  helpSection,
  breadcrumbs,
  migasIntermedias,
  tabs,
  densidad = "normal",
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
  densidad?: "normal" | "compacta";
  className?: string;
}) {
  if (densidad === "compacta") {
    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        <div className="max-md:hidden">
          {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : <MigasDeShell titulo={title} intermedias={migasIntermedias} />}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-x-6 border-b border-border-soft md:justify-start">
          <div className="flex items-center gap-2 pb-2.5">
            <TituloDePagina title={title} compacto />
            <SectionHelpPopover section={helpSection} description={description} className="max-sm:hidden" />
          </div>
          <div className="-mb-px min-w-0">{tabs ?? <PestanasDeShell compactas />}</div>
          {actions && <div className="ml-auto flex items-center gap-2 pb-2">{actions}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {breadcrumbs ? breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} /> : <MigasDeShell titulo={title} intermedias={migasIntermedias} />}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TituloDePagina title={title} />
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
