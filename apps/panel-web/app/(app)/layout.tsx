import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { PackLockBanner } from "@/components/shell/pack-lock-banner";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { FeedbackProviders } from "@/components/ui/providers";
import { apiFetch } from "@/lib/api/server";
import type { Me, PluginSummary } from "@/lib/api/types";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const [res, packsRes] = await Promise.all([
    apiFetch<Me>("/admin/me"),
    apiFetch<PluginSummary[]>("/admin/plugins"),
  ]);
  if (!res.ok) redirect("/login");
  const me = res.data;
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
        <Sidebar me={me} packs={packs} />
        <div className="flex flex-1 flex-col">
          <Topbar me={me} />
          <main className="flex-1 px-6 py-8">
            <div className="mx-auto w-full max-w-[1200px]">
              <PackLockBanner packs={packs} />
              {children}
            </div>
          </main>
        </div>
      </div>
    </FeedbackProviders>
  );
}
