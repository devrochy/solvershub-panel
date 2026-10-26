import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";

type Ctx = { params: Promise<{ id: string; rid: string; accion: string }> };

// Acciones sobre una versión de la conexión (HU-AOS-27). Solo estas llegan a la API.
const POST_ACCIONES: Record<string, string> = { publicar: "promote", medir: "evaluate", detener: "stop" };

/** BFF: publicar (promote), medir (evaluate) o detener (stop) una versión. */
export async function POST(_request: Request, ctx: Ctx) {
  const { id, rid, accion } = await ctx.params;
  const destino = POST_ACCIONES[accion];
  if (!UUID.test(id) || !UUID.test(rid) || !destino) return invalido();
  const res = await apiFetch<unknown>(`/admin/connections/${id}/releases/${rid}/${destino}`, {
    method: "POST",
    // Publicar lleva su motivo (queda en el evento); medir y detener no llevan cuerpo.
    body: destino === "promote" ? { reason: "panel_versiones" } : undefined,
  });
  return responder(res);
}

/** BFF: «Ver diferencias» frente a la activa (o `?contra=<rid>` de la misma conexión). */
export async function GET(request: Request, ctx: Ctx) {
  const { id, rid, accion } = await ctx.params;
  if (!UUID.test(id) || !UUID.test(rid) || accion !== "diferencias") return invalido();
  const contra = new URL(request.url).searchParams.get("contra");
  if (contra && !UUID.test(contra)) return invalido();
  const res = await apiFetch<unknown>(
    `/admin/connections/${id}/releases/${rid}/diff${contra ? `?against=${contra}` : ""}`,
  );
  return responder(res);
}
