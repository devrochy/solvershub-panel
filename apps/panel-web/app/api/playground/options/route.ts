import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import { CLAVE_VALIDA } from "@/lib/plantillas-opciones";

/**
 * BFF de «Probar plantilla con opciones» en el playground (SPEC-40, pista B2): envía la versión publicada de la
 * plantilla `clave` a la conversación de prueba (canal `test`), sin Meta. Solo viajan `clave` y, opcional,
 * `connection_id`; el permiso (dueño o master con escritura) y la bandera los decide el backend, y su error
 * (`code`, estado) pasa tal cual para que la pantalla lo explique.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { clave?: unknown; connection_id?: unknown } | null;
  if (!body || typeof body !== "object" || typeof body.clave !== "string" || !CLAVE_VALIDA.test(body.clave)) {
    return invalido("La clave de la plantilla no es válida.");
  }
  const conexion = body.connection_id;
  if (conexion !== undefined && conexion !== null && (typeof conexion !== "string" || !UUID.test(conexion))) {
    return invalido("La conexión no es válida.");
  }
  const res = await apiFetch<unknown>("/admin/playground/options", {
    method: "POST",
    body: { clave: body.clave, ...(conexion ? { connection_id: conexion } : {}) },
  });
  return responder(res);
}

