import type { ReactNode } from "react";

import { BotonBuscar } from "@/components/shell/boton-buscar";
import { EstadoAsistente } from "@/components/shell/estado-asistente";
import { TenantSwitcher } from "@/components/shell/tenant-switcher";
import type { Me } from "@/lib/api/types";

export async function Topbar({
  me,
  menu,
  asistentePausado = false,
  puedeReactivar = false,
}: {
  me: Me;
  menu?: ReactNode;
  asistentePausado?: boolean;
  puedeReactivar?: boolean;
}) {
  return (
    <>
      <header className="flex h-16 items-center justify-between gap-2 border-b border-border-soft bg-surface px-4 md:px-6 print:hidden">
        <div className="flex min-w-0 items-center gap-2">
          {menu}
          <TenantSwitcher current={me.tenant} count={me.tenant_count} />
        </div>
        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <BotonBuscar />
          <EstadoAsistente pausado={asistentePausado} puedeReactivar={puedeReactivar} className="hidden md:flex" />
        </div>
      </header>
      <EstadoAsistente
        pausado={asistentePausado}
        puedeReactivar={puedeReactivar}
        variante="franja"
        className="md:hidden"
      />
    </>
  );
}
