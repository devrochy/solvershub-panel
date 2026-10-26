import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import { porcentajeValido } from "@/lib/canary";

type Ctx = { params: Promise<{ id: string }> };

/** BFF: estado de la prueba con una parte de los clientes (HU-AOS-32); `null` si no hay prueba. */
export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return invalido();
  return responder(await apiFetch<unknown>(`/admin/connections/${id}/canary`));
}

/** BFF: cambiar el porcentaje de la prueba (1 a 50). */
export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const cuerpo = (await request.json().catch(() => null)) as { percent?: unknown } | null;
  const percent = cuerpo?.percent;
  if (!UUID.test(id) || typeof percent !== "number" || !porcentajeValido(percent)) return invalido();
  return responder(await apiFetch<unknown>(`/admin/connections/${id}/canary`, { method: "PATCH", body: { percent } }));
}
