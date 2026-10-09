import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { InvitacionesPendientes } from "@/components/domain/invitaciones-pendientes";
import { MobileNav } from "@/components/shell/mobile-nav";
import { PackLockBanner } from "@/components/shell/pack-lock-banner";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { FeedbackProviders } from "@/components/ui/providers";
import { apiFetch } from "@/lib/api/server";
import type { Me, PendingInvitations, PluginSummary } from "@/lib/api/types";

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
  // Packs habilitados del tenant para el gating del menú (ADR-0019). Si la
  // consulta falla, no se bloquea nada (el menú se comporta como antes).
  const packs = Object.fromEntries(
    (packsRes.ok ? packsRes.data : []).map((p) => [
      p.id,
      { enabled: p.enabled_for_tenant, hasConfig: p.has_config },
    ]),
  );

  return (
    <FeedbackProviders>
      <div className="flex min-h-screen">
        {/* En celular la barra lateral vive en el menú móvil de la barra superior. */}
        <Sidebar me={me} packs={packs} className="hidden md:flex" />
        {/* min-w-0: sin esto una tabla ancha estira la columna y desborda la página. */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar me={me} menu={<MobileNav me={me} packs={packs} />} />
          <main className="flex-1 px-4 py-6 md:px-6 md:py-8">
            <div className="mx-auto w-full max-w-[1200px]">
              {invitaciones?.ok && <InvitacionesPendientes items={invitaciones.data.items} />}
              <PackLockBanner packs={packs} />
              {children}
            </div>
          </main>
        </div>
      </div>
    </FeedbackProviders>
  );
}
