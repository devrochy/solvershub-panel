import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import { esPayloadDeOpciones } from "@/lib/playground-opciones";

/**
 * BFF del toque de un botón en el playground (SPEC-40, pista B2). **Ejecuta la tool de verdad** contra los datos
 * del negocio, por el mismo resolver que atiende WhatsApp. Solo se reenvía un `payload` con la forma de un botón
 * de opciones (`opt:`/`optc:`/`optn:`, ≤256) y, opcional, `connection_id`: nada más llega al backend. La firma, la
 * vigencia, la bandera y el permiso los decide el backend y su error pasa con su `code` y estado.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { payload?: unknown; connection_id?: unknown } | null;
  if (!body || typeof body !== "object" || !esPayloadDeOpciones(body.payload)) {
    return invalido("Ese botón no es de una plantilla con opciones.");
  }
  const conexion = body.connection_id;
  if (conexion !== undefined && conexion !== null && (typeof conexion !== "string" || !UUID.test(conexion))) {
    return invalido("La conexión no es válida.");
  }
  const res = await apiFetch<unknown>("/admin/playground/tap", {
    method: "POST",
    body: { payload: body.payload, ...(conexion ? { connection_id: conexion } : {}) },
  });
  return responder(res);
}
