import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import type { AgentSkillPage } from "@/lib/api/types";

/** BFF: habilidades que se agregan a uno o varios agentes y si este agente las tiene (ADR-0190, HU-AOS-66). */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return invalido();
  const res = await apiFetch<AgentSkillPage>(`/admin/agents/${id}/skills?page_size=50`);
  return responder(res, (data) => data.items);
}
