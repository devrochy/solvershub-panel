import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";

/** BFF: volver a la versión anterior de la conexión (HU-AOS-27, `POST /rollback`). */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return invalido();
  const res = await apiFetch<unknown>(`/admin/connections/${id}/rollback`, { method: "POST", body: { reason: "panel_versiones" } });
  return responder(res);
}
