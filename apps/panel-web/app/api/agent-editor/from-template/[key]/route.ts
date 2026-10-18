import { invalido, responder } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import type { FromTemplateOut } from "@/lib/api/types";

/** BFF: crea un agente desde una plantilla (HU-AOS-24). */
export async function POST(request: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  if (!/^[a-z0-9_]{2,40}$/.test(key)) return invalido("Plantilla inválida.");
  const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
  const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim().slice(0, 120) : undefined;
  const res = await apiFetch<FromTemplateOut>(`/admin/agent-templates/${key}/agents`, {
    method: "POST",
    body: name ? { name } : {},
  });
  return responder(res, (data) => ({ agentId: data.agent.id, warnings: data.warnings }));
}
