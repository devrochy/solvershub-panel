import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import type { AgentSkill } from "@/lib/api/types";

const PACK = /^[a-z0-9_]{2,60}$/;

/** BFF: instala, quita o configura una habilidad del agente (Pagos en línea con `cuenta_id`). */
export async function PUT(request: Request, ctx: { params: Promise<{ id: string; pack: string }> }) {
  const { id, pack } = await ctx.params;
  if (!UUID.test(id) || !PACK.test(pack)) return invalido();
  const body = (await request.json().catch(() => null)) as { installed?: unknown; config?: unknown } | null;
  if (!body || typeof body.installed !== "boolean") return invalido();
  const config = body.config && typeof body.config === "object" ? (body.config as Record<string, unknown>) : undefined;
  const res = await apiFetch<AgentSkill>(`/admin/agents/${id}/skills/${pack}`, {
    method: "PUT",
    body: { installed: body.installed, ...(config ? { config } : {}) },
  });
  return responder(res);
}
