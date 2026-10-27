import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AvisoDeOnboarding } from "@/components/domain/aviso-de-onboarding";
import { InvitacionesPendientes } from "@/components/domain/invitaciones-pendientes";
import { AtajosProvider } from "@/components/shell/atajos";
import { GuardiaDeSeccion } from "@/components/shell/guardia-de-seccion";
import { MobileNav } from "@/components/shell/mobile-nav";
import { PackLockBanner } from "@/components/shell/pack-lock-banner";
import { ShellProvider } from "@/components/shell/shell-context";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { VigilanteDeSesion } from "@/components/shell/vigilante-de-sesion";
import { FeedbackProviders } from "@/components/ui/providers";
import { TENANT_COOKIE, apiFetch } from "@/lib/api/server";
import type { Me, PendingInvitations, PluginSummary, PrimerosPasos, SettingsResponse } from "@/lib/api/types";
import { puedeEditarAsistente } from "@/lib/asistente";
import { ATAJOS_COOKIE, SIDEBAR_COOKIE, leerAtajosActivos, leerModoSidebar } from "@/lib/shell/preferencias";
import { THEME_COOKIE, normalizeTheme } from "@/lib/theme";
import { claveDeNegocio } from "@/lib/shell/sesion";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Preferencias del shell en cookies (HU-DS-04 y HU-DS-05): las lee el servidor, sin salto al cargar.
  const store = await cookies();
  const [res, packsRes] = await Promise.all([
    apiFetch<Me>("/admin/me"),
    apiFetch<PluginSummary[]>("/admin/plugins"),
  ]);
  if (!res.ok) {
    // Negocio suspendido (403 `tenant_suspended`) o cuenta desactivada (401): la sesión ya no
    // vale; se cierra en el navegador (cookies) y se vuelve a /login.
    if (res.status === 401 || res.code === "tenant_suspended") redirect("/api/session/cerrar");
    // El negocio guardado ya no es de esta cuenta (se desvinculó): se olvida y se vuelve a
    // entrar con el que la API elija, en vez de rebotar a /login en bucle.
    if (res.status === 403 && store.get(TENANT_COOKIE)?.value) redirect("/api/tenant/reset");
    redirect("/login");
  }
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
  // Asistente de primer uso (HU-SH-10): el servidor dice si hay que abrirlo (negocio nuevo, sin tocar, y quien
  // consulta es el dueño) o si falta terminarlo (aviso permanente). Si la consulta falla, no se muestra nada.
  const primerUso = me.tenant ? await apiFetch<PrimerosPasos>("/admin/onboarding") : null;
  const recorrido = primerUso?.ok ? primerUso.data.recorrido : null;
  if (recorrido?.abrir) redirect("/bienvenida");
  const puedeTerminarPrimerUso = me.tenant?.role === "owner" || me.role === "master";
  // Packs habilitados del tenant para el gating del menú (ADR-0019). Si la
  // consulta falla, no se bloquea nada (el menú se comporta como antes).
  const packs = Object.fromEntries(
    (packsRes.ok ? packsRes.data : []).map((p) => [
      p.id,
      { enabled: p.enabled_for_tenant, hasConfig: p.has_config },
    ]),
  );

  const modoSidebar = leerModoSidebar(store.get(SIDEBAR_COOKIE)?.value);
  const theme = normalizeTheme(store.get(THEME_COOKIE)?.value);
  const atajosActivos = leerAtajosActivos(store.get(ATAJOS_COOKIE)?.value);
  const puedeEditar = puedeEditarAsistente(me.permissions);
  const esMaster = me.role === "master";

  return (
    <ShellProvider
      permisos={me.permissions}
      esMaster={esMaster}
      negocioId={me.tenant?.id ?? null}
      packs={packs}
      asistentePausado={asistentePausado}
      puedeEditarAsistente={puedeEditar}
    >
      <FeedbackProviders>
        <AtajosProvider atajosActivosIniciales={atajosActivos}>
          {/* Permisos y negocio vigentes en cada navegación (no un snapshot de la primera carga). */}
          <VigilanteDeSesion />
          {/* Salto al contenido (HU-UI-03): primer elemento enfocable de cada página. */}
          <a
            href="#contenido"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:text-headline focus:shadow-elev-2"
          >
            Saltar al contenido
          </a>
          <div className="flex min-h-screen">
            {/* En celular la barra lateral vive en el menú móvil de la barra superior. */}
            <Sidebar me={me} packs={packs} modo={modoSidebar} initialTheme={theme} className="sticky top-0 hidden h-screen md:flex print:hidden" />
            {/* min-w-0: sin esto una tabla ancha estira la columna y desborda la página. */}
            <div className="flex min-w-0 flex-1 flex-col">
              <Topbar
                me={me}
                menu={<MobileNav me={me} packs={packs} initialTheme={theme} />}
                asistentePausado={asistentePausado}
                puedeReactivar={puedeEditar}
              />
              {/*
               * La clave es el negocio activo: al cambiarlo, la vista se vuelve a montar y los
               * formularios del cliente arrancan con los datos del negocio nuevo (un
               * `router.refresh()` solo conserva el estado que ya tenían).
               */}
              <main
                key={claveDeNegocio(me)}
                id="contenido"
                tabIndex={-1}
                className="flex-1 px-4 py-6 focus:outline-none md:px-6 md:py-8"
              >
                <div className="mx-auto w-full max-w-[1200px]">
                  {invitaciones?.ok && <InvitacionesPendientes items={invitaciones.data.items} />}
                  {puedeTerminarPrimerUso && <AvisoDeOnboarding recorrido={recorrido} />}
                  <PackLockBanner packs={packs} />
                  <GuardiaDeSeccion>{children}</GuardiaDeSeccion>
                </div>
              </main>
            </div>
          </div>
        </AtajosProvider>
      </FeedbackProviders>
    </ShellProvider>
  );
}
