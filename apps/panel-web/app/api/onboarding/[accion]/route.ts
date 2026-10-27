import { invalido, responder, UUID } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import type { Recorrido } from "@/lib/onboarding";
import { TOTAL_PASOS } from "@/lib/onboarding";

const ACCIONES = new Set(["avanzar", "omitir", "reanudar", "finalizar", "dejar-listo"]);

/**
 * BFF del asistente de primer uso (HU-UX-21, HU-SH-10): reenvía al servidor la acción que el dueño
 * elige. Quién puede y si «completo» es cierto lo decide la API; aquí solo se validan las formas.
 */
export async function POST(request: Request, ctx: { params: Promise<{ accion: string }> }) {
  const { accion } = await ctx.params;
  if (!ACCIONES.has(accion)) return invalido("Acción inválida.");
  const body = (await request.json().catch(() => ({}))) as { paso?: unknown; agent_id?: unknown } | null;

  if (accion === "avanzar") {
    const paso = body?.paso;
    if (!Number.isInteger(paso) || (paso as number) < 1 || (paso as number) > TOTAL_PASOS) return invalido("Paso inválido.");
    return responder(await apiFetch<Recorrido>("/admin/onboarding/avanzar", { method: "POST", body: { paso } }));
  }
  if (accion === "dejar-listo") {
    const agente = body?.agent_id;
    if (typeof agente !== "string" || !UUID.test(agente)) return invalido("Agente inválido.");
    return responder(await apiFetch("/admin/onboarding/dejar-listo", { method: "POST", body: { agent_id: agente } }));
  }
  return responder(await apiFetch<Recorrido>(`/admin/onboarding/${accion}`, { method: "POST" }));
}
