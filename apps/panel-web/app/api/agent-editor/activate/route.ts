import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";

/**
 * BFF: activa la versión candidata de una conexión con el promote de la API de releases
 * (HU-AOS-14). Solo el propietario o el master; la API lo vuelve a exigir.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { connection_id?: unknown; release_id?: unknown } | null;
  const conexion = body?.connection_id;
  const release = body?.release_id;
  if (typeof conexion !== "string" || typeof release !== "string" || !UUID.test(conexion) || !UUID.test(release)) {
    return invalido();
  }
  const res = await apiFetch(`/admin/connections/${conexion}/releases/${release}/promote`, {
    method: "POST",
    body: { reason: "editor_agentes" },
  });
  return responder(res, () => ({ ok: true }));
}
