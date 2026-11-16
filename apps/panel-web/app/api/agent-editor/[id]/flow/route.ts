import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import type { AgentFlowOut } from "@/lib/api/types";

/**
 * BFF: guarda el flujo de atención del agente (ADR-0195, HU-AOS-74) con el `lock_version` del
 * borrador. Devuelve la respuesta de la API tal cual (`flow`, `lock_version`, `warnings`): el editor
 * lee `lock_version` para encadenar el siguiente guardado.
 */
export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return invalido();
  const body = (await request.json().catch(() => null)) as { flow?: unknown; lock_version?: unknown } | null;
  if (!body || typeof body.flow !== "object" || body.flow === null || Array.isArray(body.flow) || !Number.isInteger(body.lock_version)) {
    return invalido();
  }
  const res = await apiFetch<AgentFlowOut>(`/admin/agents/${id}/flow`, {
    method: "PUT",
    body: { flow: body.flow, lock_version: body.lock_version },
  });
  return responder(res);
}
