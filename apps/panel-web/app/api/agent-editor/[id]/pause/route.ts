import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import type { AgentSummary } from "@/lib/api/types";

/** BFF: pausa un especialista (HU-ARCH-38). Deja de atender en segundos, sin publicar; atiende el agente por defecto. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return invalido();
  const body = (await request.json().catch(() => null)) as { reason?: unknown } | null;
  const motivo = typeof body?.reason === "string" ? body.reason.trim().slice(0, 300) : "";
  const res = await apiFetch<AgentSummary>(`/admin/agents/${id}/pause`, {
    method: "POST",
    body: motivo ? { reason: motivo } : {},
  });
  return responder(res);
}
