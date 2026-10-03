import type { ReactNode } from "react";

import { SectionHelpButton } from "@/app/(app)/_components/section-help-button";
import { cn } from "@/lib/utils";

/** Cabecera de página: título + descripción + acciones. Único lugar para el H1. */
export function PageHeader({
  title,
  description,
  actions,
  helpSection,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Clave de `lib/copy.ts` para el "¿Qué es esto?". Opcional. */
  helpSection?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-headline">{title}</h1>
          {helpSection && <SectionHelpButton section={helpSection} />}
        </div>
        {description && <p className="mt-1 max-w-2xl text-sm text-body">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
