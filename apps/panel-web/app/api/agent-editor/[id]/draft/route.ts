import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import type { AgentDraft } from "@/lib/api/types";

/** BFF: guarda el borrador del agente con su `lock_version` (HU-AOS-24). */
export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return invalido();
  const body = (await request.json().catch(() => null)) as { content?: unknown; lock_version?: unknown } | null;
  if (!body || typeof body.content !== "object" || body.content === null || !Number.isInteger(body.lock_version)) {
    return invalido();
  }
  const res = await apiFetch<AgentDraft>(`/admin/agents/${id}/draft`, {
    method: "PUT",
    body: { content: body.content, lock_version: body.lock_version },
  });
  return responder(res, (data) => ({ lockVersion: data.lock_version, content: data.content }));
}
