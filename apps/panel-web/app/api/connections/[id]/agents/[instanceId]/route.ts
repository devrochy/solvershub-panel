import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";

type Ctx = { params: Promise<{ id: string; instanceId: string }> };

/** BFF: habilitar o deshabilitar, cambiar la prioridad o volver principal a un agente de la conexión. */
export async function PATCH(request: Request, ctx: Ctx) {
  const { id, instanceId } = await ctx.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!UUID.test(id) || !UUID.test(instanceId) || !body) return invalido();
  const payload: Record<string, unknown> = {};
  if (typeof body.enabled === "boolean") payload.enabled = body.enabled;
  if (typeof body.priority === "number") payload.priority = body.priority;
  // La API solo acepta `true`: el principal se cambia eligiendo otro.
  if (body.is_default === true) payload.is_default = true;
  if (Object.keys(payload).length === 0) return invalido();
  return responder(
    await apiFetch<unknown>(`/admin/connections/${id}/agents/${instanceId}`, { method: "PATCH", body: payload }),
  );
}

/** BFF: quitar un especialista de la conexión (borrado lógico). */
export async function DELETE(_request: Request, ctx: Ctx) {
  const { id, instanceId } = await ctx.params;
  if (!UUID.test(id) || !UUID.test(instanceId)) return invalido();
  return responder(await apiFetch<unknown>(`/admin/connections/${id}/agents/${instanceId}`, { method: "DELETE" }));
}
