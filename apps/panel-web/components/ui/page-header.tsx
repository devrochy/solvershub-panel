import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Cabecera de página: título + descripción + acciones. Único lugar para el H1. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-headline">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-body">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
