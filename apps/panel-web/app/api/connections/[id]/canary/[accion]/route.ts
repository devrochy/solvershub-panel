import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";

type Ctx = { params: Promise<{ id: string; accion: string }> };

// Acciones sobre la prueba en curso (HU-AOS-32). Solo estas llegan a la API.
const ACCIONES: Record<string, string> = { detener: "stop", publicar: "promote" };

/** BFF: detener la prueba (se puede volver a probar) o publicar la versión en prueba para todos. */
export async function POST(_request: Request, ctx: Ctx) {
  const { id, accion } = await ctx.params;
  const destino = ACCIONES[accion];
  if (!UUID.test(id) || !destino) return invalido();
  return responder(await apiFetch<unknown>(`/admin/connections/${id}/canary/${destino}`, { method: "POST" }));
}
