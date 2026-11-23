import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import type { components } from "@/lib/api/schema";

type AgentGuardrailsOut = components["schemas"]["AgentGuardrailsOut"];

/**
 * BFF: reglas de respuesta del agente (HU-AOS-97). Reemplaza la lista entera del borrador con el `lock_version`
 * vigente; la forma de cada regla la valida la API (error por campo `guardrails[i]…`).
 */
export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return invalido();
  const body = (await request.json().catch(() => null)) as { guardrails?: unknown; lock_version?: unknown } | null;
  if (!body || !Array.isArray(body.guardrails) || !Number.isInteger(body.lock_version)) return invalido();
  const res = await apiFetch<AgentGuardrailsOut>(`/admin/agents/${id}/guardrails`, {
    method: "PUT",
    body: { guardrails: body.guardrails, lock_version: body.lock_version },
  });
  return responder(res);
}
