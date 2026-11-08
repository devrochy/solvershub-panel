import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";

const ESTADOS = new Set(["active", "archived"]);

/**
 * BFF: nombre y descripción del agente (HU-AOS-24), o su estado (archivar / reactivar) por separado.
 * La API no deja archivar el General ni el Coordinador (409 `agent_reserved`) ni un agente que sigue en
 * una conexión (409 `agent_in_use`).
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return invalido();
  const body = (await request.json().catch(() => null)) as
    | { name?: unknown; description?: unknown; status?: unknown }
    | null;
  if (body && "status" in body) {
    if (typeof body.status !== "string" || !ESTADOS.has(body.status)) return invalido();
    const res = await apiFetch(`/admin/agents/${id}`, { method: "PATCH", body: { status: body.status } });
    return responder(res, () => ({ ok: true }));
  }
  if (typeof body?.name !== "string" || typeof body.description !== "string") return invalido();
  const res = await apiFetch(`/admin/agents/${id}`, {
    method: "PATCH",
    body: { name: body.name.trim().slice(0, 120), description: body.description.slice(0, 1000) },
  });
  return responder(res, () => ({ ok: true }));
}
