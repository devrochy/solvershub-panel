import { EditorDePermisos } from "@/app/(app)/agentes/colaboracion/_components/editor-de-permisos";
import { ProbarFrase } from "@/app/(app)/agentes/colaboracion/_components/probar-frase";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { AgentsOverview, AgentSummary, ConnectionsConsole, Graph, Me } from "@/lib/api/types";
import { desdeEnlaces, puedeEditarPermisos } from "@/lib/colaboracion";

export const metadata = { title: "Colaboración" };

/**
 * Colaboración entre agentes (HU-AOS-26): los permisos como lista accesible (con mapa opcional de
 * solo lectura) y «Probar una frase» contra el router de cada conexión.
 */
export default async function ColaboracionPage() {
  const [grafo, agentesRes, meRes, overview, consola] = await Promise.all([
    apiFetch<Graph>("/admin/a2a/graph"),
    apiFetch<AgentSummary[]>("/admin/agents"),
    apiFetch<Me>("/admin/me"),
    apiFetch<AgentsOverview>("/admin/agents/overview"),
    apiFetch<ConnectionsConsole>("/admin/connections/console?page=1&page_size=100"),
  ]);
  if (!grafo.ok || !agentesRes.ok) {
    const error = !grafo.ok ? grafo.error : !agentesRes.ok ? agentesRes.error : "";
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudieron cargar los permisos: {error}
      </p>
    );
  }
  const runtime = overview.ok ? overview.data.runtime : "legacy";
  const puedeEditar = meRes.ok && puedeEditarPermisos(meRes.data, runtime);
  // Solo los especialistas activos colaboran (el Coordinador reparte; nadie lo llama).
  const especialistas = agentesRes.data
    .filter((a) => a.kind === "specialist" && a.status === "active")
    .map((a) => ({ id: a.id, name: a.name || a.key }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const nombresPorKey = Object.fromEntries(agentesRes.data.map((a) => [a.key, a.name || a.key]));
  // «Probar una frase» necesita ver las conexiones; sin ese permiso no se muestra.
  const conexiones = consola.ok
    ? consola.data.items.filter((c) => c.conversational).map((c) => ({ id: c.id, label: c.label || c.channel }))
    : null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Colaboración"
        description="Quién puede pasarle la conversación, encargarle o consultarle a quién, y a qué agente le llega cada mensaje."
        helpSection="agents"
      />

      {runtime !== "v3" && (
        <p className="rounded-lg border border-status-info-border bg-status-info-bg px-4 py-3 text-sm text-body">
          Tu asistente todavía atiende con un solo agente. Los permisos entre agentes se activan con el Agent OS de tu
          negocio.
        </p>
      )}

      <section aria-labelledby="permisos" className="flex flex-col gap-3">
        <div>
          <h2 id="permisos" className="font-display text-lg font-semibold text-headline">
            Permisos entre agentes
          </h2>
          <p className="text-sm text-soft">
            Los cambios aplican cuando publicas la próxima versión de cada conexión.
            {grafo.data.version ? ` Versión ${grafo.data.version.version} de los permisos.` : ""}
          </p>
        </div>
        <EditorDePermisos
          agentes={especialistas}
          iniciales={desdeEnlaces(grafo.data.links)}
          puedeEditar={puedeEditar}
        />
      </section>

      {conexiones && (
        <section aria-labelledby="probar" className="flex flex-col gap-3">
          <div>
            <h2 id="probar" className="font-display text-lg font-semibold text-headline">
              Probar una frase
            </h2>
            <p className="text-sm text-soft">
              Escribe lo que diría un cliente y mira qué agente lo atendería con la versión activa, y por qué. No envía
              nada ni gasta.
            </p>
          </div>
          <ProbarFrase conexiones={conexiones} nombresPorKey={nombresPorKey} />
        </section>
      )}
    </div>
  );
}
