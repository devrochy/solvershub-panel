import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";

/** BFF: «En curso» de la conversación para quien la toma (HU-AOS-28). */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return invalido();
  return responder(await apiFetch<unknown>(`/admin/conversations/${id}/in-progress`));
}
