import { responder } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import type { FeedbackBandeja } from "@/lib/api/types";
import { consultaDeBandeja } from "@/lib/feedback-revision";

/**
 * BFF: bandeja de reportes de clientes entre negocios (SPEC-54, ADR-0213). Solo viajan los filtros
 * válidos (`estado`, `tipo`, `tenant_id`, `cursor`, `limit`); el servidor exige actuar como master.
 */
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const consulta = consultaDeBandeja(
    {
      estado: sp.get("estado") ?? undefined,
      tipo: sp.get("tipo") ?? undefined,
      tenant_id: sp.get("tenant_id") ?? undefined,
      cursor: sp.get("cursor") ?? undefined,
    },
    Number(sp.get("limit") ?? undefined),
  );
  return responder(await apiFetch<FeedbackBandeja>(`/platform/feedback/reports${consulta}`));
}
