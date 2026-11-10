import Link from "next/link";

import { AgentesDeConexion, type FilaAgente } from "@/app/(app)/conexiones/_components/agentes-de-conexion";
import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { apiFetch } from "@/lib/api/server";
import type { AgentSummary, Me } from "@/lib/api/types";
import type { components } from "@/lib/api/schema";
import { puedeEditarAgentesDeConexion } from "@/lib/conexion-ficha";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";
import { versionDeAgente } from "@/lib/conexiones";

export const metadata = { title: "Agentes" };

type Instancia = components["schemas"]["ConnectionAgentInstance"];

/**
 * Agentes de la conexión (HU-UX-09): el Coordinador y los especialistas con su rol, prioridad,
 * principal, versión y estado. Solo existe en los canales; las integraciones no llevan agentes.
 */
export default async function AgentesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await fichaDePestana(id, "agentes");
  if (!ficha) return null;
  const c = ficha.conexion;
  const [instanciasRes, agentesRes, meRes] = await Promise.all([
    apiFetch<Instancia[]>(`/admin/connections/${id}/agents`),
    apiFetch<AgentSummary[]>("/admin/agents"),
    apiFetch<Me>("/admin/me"),
  ]);
  if (!instanciasRes.ok) {
    return (
      <SeccionFicha titulo="Agentes">
        <ErrorDeCarga titulo="No se pudieron cargar los agentes de la conexión" detalle={instanciasRes.error} />
      </SeccionFicha>
    );
  }
  const runtime = ficha.consola.runtime;
  const puedeEditar = meRes.ok && puedeEditarAgentesDeConexion(meRes.data, runtime);
  // La versión que corre sale de la consola (release activa); la instancia trae solo la última publicada.
  const deConsola = new Map([...(c.coordinator ? [c.coordinator] : []), ...c.agents].map((a) => [a.instance_id, a]));
  const filas: FilaAgente[] = instanciasRes.data.map((i) => ({
    instanceId: i.id,
    agentId: i.agent_id,
    name: i.name,
    role: i.role,
    priority: i.priority,
    isDefault: i.is_default,
    enabled: i.enabled,
    version: versionDeAgente(deConsola.get(i.id) ?? { release_version: null, latest_version: i.latest_version }),
  }));
  const yaEstan = new Set(instanciasRes.data.map((i) => i.agent_id));
  const asignables = (agentesRes.ok ? agentesRes.data : [])
    .filter((a) => a.kind !== "core" && a.latest_version != null && a.status !== "retired" && !yaEstan.has(a.id))
    .map((a) => ({ id: a.id, name: a.name }));
  const tieneCoordinador = c.coordinator != null || instanciasRes.data.some((i) => i.role === "core");

  return (
    <SeccionFicha titulo="Agentes" descripcion="Quién atiende a tus clientes por esta conexión.">
      {runtime !== "v3" && (
        <p role="note" className="rounded-md border border-status-info-border bg-status-info-bg px-4 py-3 text-sm text-body">
          Por ahora el equipo de SolversHub cambia los agentes de tu negocio. Aquí ves quién atiende.
        </p>
      )}
      {!tieneCoordinador && (
        <p role="note" className="rounded-md border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-headline">
          Esta conexión todavía no tiene Coordinador: sin él no se pueden sumar especialistas. Se crea solo con la próxima
          versión.
        </p>
      )}
      <AgentesDeConexion
        conexionId={id}
        filas={filas}
        asignables={asignables}
        puedeEditar={puedeEditar}
        tieneCoordinador={tieneCoordinador}
      />
      {puedeEditar && asignables.length === 0 && (
        <p className="text-xs text-text-soft">
          No hay más agentes publicados para asignar. Crea o publica uno en{" "}
          <Link href="/agentes" className="text-link underline-offset-2 hover:underline">
            Agentes
          </Link>
          .
        </p>
      )}
    </SeccionFicha>
  );
}
