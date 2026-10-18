import Link from "next/link";

import { AgentCard } from "@/app/(app)/agentes/_components/agent-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { AgentsOverview, Me } from "@/lib/api/types";
import { puedeEditarAgentes } from "@/lib/agentes";

export const metadata = { title: "Agentes" };

export default async function AgentesPage() {
  const [res, meRes] = await Promise.all([apiFetch<AgentsOverview>("/admin/agents/overview"), apiFetch<Me>("/admin/me")]);
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudieron cargar los agentes: {res.error}
      </p>
    );
  }
  const { runtime } = res.data;
  // El General «virtual» (negocio sin el agente General) solo se muestra si tiene algo que ver.
  const items = res.data.items.filter((a) => !a.virtual || runtime !== "v3" || a.turns > 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Agentes"
        description="Cada agente que atiende tu negocio y lo que construyó: conversaciones, tareas, clientes, registros y consumo."
        helpSection="agents"
        actions={
          // El editor (HU-AOS-24) escribe en `settings`; sin ese permiso el botón no se muestra.
          meRes.ok && puedeEditarAgentes(meRes.data, runtime) ? (
            <Button asChild variant="accent">
              <Link href="/agentes/nuevo">Nuevo agente</Link>
            </Button>
          ) : undefined
        }
      />

      {runtime !== "v3" && (
        <p className="rounded-lg border border-status-info-border bg-status-info-bg px-4 py-3 text-sm text-body">
          Tu asistente todavía atiende con un solo agente, el General. Cuando el Agent OS se active en tu negocio,
          cada especialista (Ventas, Agenda, Cobranza…) tendrá aquí su propia vista.
        </p>
      )}

      {items.length === 0 ? (
        <EmptyState
          title="Todavía no hay agentes"
          description="Cuando tu negocio tenga agentes publicados, aquí verás lo que hace cada uno."
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((agent) => (
            <li key={agent.ref} className="flex">
              <AgentCard agent={agent} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
