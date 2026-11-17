import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import type { components } from "@/lib/api/schema";

type AgentScheduleOut = components["schemas"]["AgentScheduleOut"];

/**
 * BFF: horario propio del agente (HU-AOS-82). `schedule: null` vuelve a heredar el del negocio. Va con
 * el `lock_version` del borrador y devuelve el nuevo para que el editor encadene el siguiente guardado.
 */
export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return invalido();
  const body = (await request.json().catch(() => null)) as { schedule?: unknown; lock_version?: unknown } | null;
  const valido = body && (body.schedule === null || (typeof body.schedule === "object" && !Array.isArray(body.schedule)));
  if (!body || !valido || !Number.isInteger(body.lock_version)) return invalido();
  const res = await apiFetch<AgentScheduleOut>(`/admin/agents/${id}/schedule`, {
    method: "PUT",
    body: { schedule: body.schedule, lock_version: body.lock_version },
  });
  return responder(res);
}
