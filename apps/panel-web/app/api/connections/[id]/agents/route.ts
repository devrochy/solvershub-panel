import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";

type Ctx = { params: Promise<{ id: string }> };

/** BFF: agentes de una conexión (HU-UX-09, `connection_agents.py`). */
export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return invalido();
  return responder(await apiFetch<unknown>(`/admin/connections/${id}/agents`));
}

/** Asigna un especialista. Solo viajan los campos que acepta la API (`extra="forbid"`). */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!UUID.test(id) || !body || typeof body.agent_id !== "string" || !UUID.test(body.agent_id)) return invalido();
  const payload: Record<string, unknown> = { agent_id: body.agent_id };
  if (typeof body.priority === "number") payload.priority = body.priority;
  if (typeof body.enabled === "boolean") payload.enabled = body.enabled;
  if (typeof body.is_default === "boolean") payload.is_default = body.is_default;
  return responder(await apiFetch<unknown>(`/admin/connections/${id}/agents`, { method: "POST", body: payload }));
}
