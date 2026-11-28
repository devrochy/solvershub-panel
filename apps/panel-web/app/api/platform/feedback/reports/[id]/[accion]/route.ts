import { UUID, invalido, responder } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import type { FeedbackReporteMaster } from "@/lib/api/types";
import { validarAprobacion, validarRechazo } from "@/lib/feedback-revision";

type Ctx = { params: Promise<{ id: string; accion: string }> };

/**
 * BFF: tomar, aprobar (`{ creditos }`) o rechazar un reporte (ADR-0213). El cuerpo se rearma con los
 * campos permitidos, nunca se reenvía tal cual. El servidor exige `role == "master"` y devuelve 409
 * `reporte_ya_decidido` o 422 de topes con `code` y `details`, que el BFF pasa sin cambios.
 */
export async function POST(request: Request, ctx: Ctx) {
  const { id, accion } = await ctx.params;
  if (!UUID.test(id)) return invalido();
  const ruta = `/platform/feedback/reports/${id}/${accion}`;
  if (accion === "tomar") {
    return responder(await apiFetch<FeedbackReporteMaster>(ruta, { method: "POST" }));
  }
  if (accion !== "aprobar" && accion !== "rechazar") return invalido();
  const json = await request.json().catch(() => null);
  const validado = accion === "aprobar" ? validarAprobacion(json) : validarRechazo(json);
  if (!validado.ok) return invalido(validado.error);
  return responder(await apiFetch<FeedbackReporteMaster>(ruta, { method: "POST", body: validado.cuerpo }));
}
