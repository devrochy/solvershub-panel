import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import type { EditorPublishOut } from "@/lib/api/types";

/** BFF: publica el agente en las conexiones elegidas, sin activar la versión (HU-AOS-24, D-35). */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return invalido();
  const body = (await request.json().catch(() => null)) as {
    connection_ids?: unknown;
    lock_version?: unknown;
    notes?: unknown;
  } | null;
  const conexiones = Array.isArray(body?.connection_ids) ? body.connection_ids : null;
  if (!conexiones || !conexiones.every((c) => typeof c === "string" && UUID.test(c))) return invalido();
  const res = await apiFetch<EditorPublishOut>(`/admin/agents/${id}/publish`, {
    method: "POST",
    body: {
      connection_ids: conexiones,
      ...(Number.isInteger(body?.lock_version) ? { lock_version: body?.lock_version } : {}),
      notes: typeof body?.notes === "string" ? body.notes.slice(0, 2000) : "",
    },
  });
  return responder(res);
}
