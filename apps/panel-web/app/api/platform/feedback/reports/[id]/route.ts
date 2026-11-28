import { UUID, invalido, responder } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import type { FeedbackReporteMaster } from "@/lib/api/types";

type Ctx = { params: Promise<{ id: string }> };

/** BFF: detalle de un reporte para el equipo, con la nota interna y los adjuntos firmados (10 min). */
export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return invalido();
  return responder(await apiFetch<FeedbackReporteMaster>(`/platform/feedback/reports/${id}`));
}
