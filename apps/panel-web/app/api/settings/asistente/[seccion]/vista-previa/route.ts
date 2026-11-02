import { NextResponse } from "next/server";

import { invalido, responder } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import type { PropuestaAsistente } from "@/lib/api/types";
import { leerRespuestas } from "@/lib/configuracion-asistente";

/** Secciones del guion del asistente de Configuración (HU-CFG-10): nada más se reenvía al backend. */
const SECCIONES = new Set(["voz", "atencion"]);

/**
 * BFF: qué cambiaría el asistente con esas respuestas (valor actual → propuesto). No escribe nada. Los
 * errores de la API (404 sección, 422 por pregunta, 403) viajan con su estado, `code` y `fields`.
 */
export async function POST(request: Request, ctx: { params: Promise<{ seccion: string }> }) {
  const { seccion } = await ctx.params;
  if (!SECCIONES.has(seccion)) {
    return NextResponse.json({ error: "Sección inválida." }, { status: 404 });
  }
  const body = (await request.json().catch(() => null)) as { respuestas?: unknown } | null;
  const respuestas = leerRespuestas(body?.respuestas);
  if (!respuestas) return invalido("Las respuestas no tienen el formato esperado.");

  const res = await apiFetch<PropuestaAsistente>(`/admin/settings/asistente/${seccion}/vista-previa`, {
    method: "POST",
    body: { respuestas },
  });
  return responder(res);
}
