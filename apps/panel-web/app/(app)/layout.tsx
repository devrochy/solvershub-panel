import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { InvitacionesPendientes } from "@/components/domain/invitaciones-pendientes";
import { AtajosProvider } from "@/components/shell/atajos";
import { MobileNav } from "@/components/shell/mobile-nav";
import { PackLockBanner } from "@/components/shell/pack-lock-banner";
import { ShellProvider } from "@/components/shell/shell-context";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { FeedbackProviders } from "@/components/ui/providers";
import { apiFetch } from "@/lib/api/server";
import type { Me, PendingInvitations, PluginSummary, SettingsResponse } from "@/lib/api/types";
import { puedeEditarAsistente } from "@/lib/asistente";
import { ATAJOS_COOKIE, SIDEBAR_COOKIE, leerAtajosActivos, leerModoSidebar } from "@/lib/shell/preferencias";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const [res, packsRes] = await Promise.all([
    apiFetch<Me>("/admin/me"),
    apiFetch<PluginSummary[]>("/admin/plugins"),
  ]);
  if (!res.ok) redirect("/login");
  const me = res.data;
  // Invitaciones que esperan respuesta (HU-SH-06): se muestran al entrar, en cualquier sección.
  // Solo se pide la lista si `/me` dice que hay alguna.
  const invitaciones =
    me.invitaciones_pendientes > 0 ? await apiFetch<PendingInvitations>("/admin/invitations/pending") : null;
  // Estado del asistente para la barra superior (HU-UI-03): solo si el usuario ve
  // Configuración y hay un negocio activo. Si la consulta falla, no se muestra nada.
  const ajustes =
    me.tenant && me.permissions?.settings ? await apiFetch<SettingsResponse>("/admin/settings") : null;
  const asistentePausado = ajustes?.ok ? ajustes.data.identity.bot_paused : false;
  // Packs habilitados del tenant para el gating del menú (ADR-0019). Si la
  // consulta falla, no se bloquea nada (el menú se comporta como antes).
  const packs = Object.fromEntries(
    (packsRes.ok ? packsRes.data : []).map((p) => [
      p.id,
      { enabled: p.enabled_for_tenant, hasConfig: p.has_config },
    ]),
  );

  // Preferencias del shell en cookies (HU-DS-04 y HU-DS-05): las lee el servidor, sin salto al cargar.
  const store = await cookies();
  const modoSidebar = leerModoSidebar(store.get(SIDEBAR_COOKIE)?.value);
  const atajosActivos = leerAtajosActivos(store.get(ATAJOS_COOKIE)?.value);
  const puedeEditar = puedeEditarAsistente(me.permissions);

  return (
    <ShellProvider
      permisos={me.permissions}
      packs={packs}
      asistentePausado={asistentePausado}
      puedeEditarAsistente={puedeEditar}
    >
      <FeedbackProviders>
        <AtajosProvider atajosActivosIniciales={atajosActivos}>
          {/* Salto al contenido (HU-UI-03): primer elemento enfocable de cada página. */}
          <a
            href="#contenido"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:text-headline focus:shadow-elev-2"
          >
            Saltar al contenido
          </a>
          <div className="flex min-h-screen">
            {/* En celular la barra lateral vive en el menú móvil de la barra superior. */}
            <Sidebar me={me} packs={packs} modo={modoSidebar} className="sticky top-0 hidden h-screen md:flex print:hidden" />
            {/* min-w-0: sin esto una tabla ancha estira la columna y desborda la página. */}
            <div className="flex min-w-0 flex-1 flex-col">
              <Topbar
                me={me}
                menu={<MobileNav me={me} packs={packs} />}
                asistentePausado={asistentePausado}
                puedeReactivar={puedeEditar}
              />
              <main id="contenido" tabIndex={-1} className="flex-1 px-4 py-6 focus:outline-none md:px-6 md:py-8">
                <div className="mx-auto w-full max-w-[1200px]">
                  {invitaciones?.ok && <InvitacionesPendientes items={invitaciones.data.items} />}
                  <PackLockBanner packs={packs} />
                  {children}
                </div>
              </main>
            </div>
          </div>
        </AtajosProvider>
      </FeedbackProviders>
    </ShellProvider>
  );
}
