import { NextResponse } from "next/server";

import { invalido, responder } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import type { PropuestaAsistente } from "@/lib/api/types";
import { leerRespuestas } from "@/lib/configuracion-asistente";

/** Secciones del guion del asistente de Configuración (HU-CFG-10): nada más se reenvía al backend. */
const SECCIONES = new Set(["voz", "atencion"]);

/**
 * BFF: aplica lo que mostró la vista previa. La huella es la de esa vista previa: si la configuración
 * cambió en medio, la API responde 409 `conflict` y no escribe (todo o nada). Reenvía 403, 404, 409 y
 * 422 con su cuerpo para que el asistente sepa qué hacer.
 */
export async function POST(request: Request, ctx: { params: Promise<{ seccion: string }> }) {
  const { seccion } = await ctx.params;
  if (!SECCIONES.has(seccion)) {
    return NextResponse.json({ error: "Sección inválida." }, { status: 404 });
  }
  const body = (await request.json().catch(() => null)) as { respuestas?: unknown; huella?: unknown } | null;
  const respuestas = leerRespuestas(body?.respuestas);
  if (!respuestas || typeof body?.huella !== "string" || !body.huella) {
    return invalido("Faltan las respuestas o la huella de la vista previa.");
  }

  const res = await apiFetch<PropuestaAsistente>(`/admin/settings/asistente/${seccion}/aplicar`, {
    method: "POST",
    body: { respuestas, huella: body.huella },
  });
  return responder(res);
}
