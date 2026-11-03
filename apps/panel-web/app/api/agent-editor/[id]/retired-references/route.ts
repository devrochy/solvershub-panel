import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import type { AgentRetiredNotices } from "@/lib/api/types";

/** BFF: avisos de referencias retiradas del agente, solo lectura (HU-AOS-59). El negocio sale de la sesión. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return invalido();
  return responder(await apiFetch<AgentRetiredNotices>(`/admin/agents/${id}/retired-references`));
}
