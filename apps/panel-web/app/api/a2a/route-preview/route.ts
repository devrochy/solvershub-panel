import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import type { RoutePreview } from "@/lib/api/types";


/** BFF: qué agente atendería una frase en una conexión (HU-AOS-26). No escribe nada. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { connection_id?: unknown; text?: unknown } | null;
  const conexion = body?.connection_id;
  const texto = typeof body?.text === "string" ? body.text.trim() : "";
  if (typeof conexion !== "string" || !UUID.test(conexion) || !texto || texto.length > 2000) return invalido();
  const res = await apiFetch<RoutePreview>("/admin/a2a/route-preview", {
    method: "POST",
    body: { connection_id: conexion, text: texto },
  });
  return responder(res);
}
