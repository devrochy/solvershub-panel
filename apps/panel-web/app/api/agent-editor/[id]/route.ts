import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";

/** BFF: nombre y descripción del agente (HU-AOS-24). */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return invalido();
  const body = (await request.json().catch(() => null)) as { name?: unknown; description?: unknown } | null;
  if (typeof body?.name !== "string" || typeof body.description !== "string") return invalido();
  const res = await apiFetch(`/admin/agents/${id}`, {
    method: "PATCH",
    body: { name: body.name.trim().slice(0, 120), description: body.description.slice(0, 1000) },
  });
  return responder(res, () => ({ ok: true }));
}
