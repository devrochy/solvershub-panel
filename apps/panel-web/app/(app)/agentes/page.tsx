import { AgentCard } from "@/app/(app)/agentes/_components/agent-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { AgentsOverview } from "@/lib/api/types";

export const metadata = { title: "Agentes" };

export default async function AgentesPage() {
  const res = await apiFetch<AgentsOverview>("/admin/agents/overview");
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudieron cargar los agentes: {res.error}
      </p>
    );
  }
  const { items, runtime } = res.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Agentes"
        description="Cada agente que atiende tu negocio y lo que construyó: conversaciones, tareas, clientes, registros y consumo."
        helpSection="agents"
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
