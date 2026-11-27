import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";

/**
 * BFF de las pruebas del agente (SPEC-53, HU-AOS-105): reenvía a `/admin/agents/{id}/pruebas…` con la sesión y el
 * negocio de las cookies. Valida cada id de la ruta (nunca se reenvía otra cosa al backend) y devuelve el `code`
 * del error para que el panel lo diga en palabras (`estimado_cambio`, `corrida_en_curso`, `plan_limit_creditos`).
 */
export type Ids = Record<string, string | undefined>;

export async function reenviarPruebas(
  ids: Ids,
  sufijo: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  request?: Request,
): Promise<Response> {
  if (!ids.id || !UUID.test(ids.id)) return invalido();
  for (const clave of ["caseId", "runId", "resultId"]) {
    if (ids[clave] !== undefined && !UUID.test(ids[clave])) return invalido();
  }
  let body: unknown;
  if (request && (method === "POST" || method === "PATCH")) {
    const texto = await request.text();
    if (texto) {
      try {
        body = JSON.parse(texto);
      } catch {
        return invalido();
      }
    }
  }
  return responder(
    await apiFetch(`/admin/agents/${ids.id}/pruebas${sufijo}`, {
      method,
      ...(body === undefined ? {} : { body }),
    }),
  );
}
