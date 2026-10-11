import type { ReactNode } from "react";
import { cookies } from "next/headers";

import { BotonBuscar } from "@/components/shell/boton-buscar";
import { EstadoAsistente } from "@/components/shell/estado-asistente";
import { LogoutButton } from "@/components/shell/logout-button";
import { TenantSwitcher } from "@/components/shell/tenant-switcher";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import type { Me } from "@/lib/api/types";
import { THEME_COOKIE, normalizeTheme } from "@/lib/theme";

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
  const store = await cookies();
  const theme = normalizeTheme(store.get(THEME_COOKIE)?.value);

  return (
    <>
      <header className="flex h-16 items-center justify-between gap-2 border-b border-border-soft bg-surface px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          {menu}
          <TenantSwitcher current={me.tenant} count={me.tenant_count} />
        </div>
        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <BotonBuscar />
          <EstadoAsistente pausado={asistentePausado} puedeReactivar={puedeReactivar} className="hidden md:flex" />
          <span className="hidden text-sm text-body sm:inline">{me.username ?? me.email}</span>
          <ThemeToggle initialTheme={theme} />
          <LogoutButton />
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
