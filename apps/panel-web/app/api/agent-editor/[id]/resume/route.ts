import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import type { AgentSummary } from "@/lib/api/types";

/** BFF: reanuda un especialista pausado (HU-ARCH-38): vuelve a atender sus conversaciones. */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return invalido();
  return responder(await apiFetch<AgentSummary>(`/admin/agents/${id}/resume`, { method: "POST" }));
}
