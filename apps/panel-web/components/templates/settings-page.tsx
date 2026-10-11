import type { ComponentProps, ReactNode } from "react";

import { PageHeader } from "@/components/ui/page-header";

type Cabecera = ComponentProps<typeof PageHeader>;

/**
 * Plantilla de configuración: cabecera, pestañas y el formulario de la pestaña activa,
 * con un ancho de lectura cómodo (los formularios no se estiran a 1200 px).
 */
export function SettingsPage({
  header,
  tabs,
  children,
}: {
  header: Cabecera;
  tabs?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader {...header} />
      {tabs}
      <div className="flex max-w-3xl flex-col gap-6">{children}</div>
    </div>
  );
}
