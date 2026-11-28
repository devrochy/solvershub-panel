import { NextResponse } from "next/server";

import { UUID, invalido } from "@/app/api/agent-editor/respuesta";
import { API_BASE, apiFetch } from "@/lib/api/server";
import type { FeedbackReporteMaster } from "@/lib/api/types";
import { MIMES_DE_ADJUNTO } from "@/lib/feedback-revision";

type Ctx = { params: Promise<{ id: string; adjunto: string }> };

/** Ruta de los archivos firmados del backend (`GET /api/v1/files/{token}`, ADR-0085). */
const RUTA_DE_ARCHIVO = /^\/api\/v1\/files\/[A-Za-z0-9._~-]+$/;

/**
 * BFF: un adjunto de un reporte, servido desde el mismo origen del panel (SPEC-54, HU-FB-06). Pide el
 * detalle (el servidor exige actuar como master y firma una URL nueva de corta duración), descarga el archivo
 * por esa URL firmada y lo devuelve con su tipo. Así la vista previa no vence ni necesita abrir la CSP
 * del panel a otros orígenes. Solo imágenes y PDF; nunca se sigue otra URL que la de archivos del backend.
 */
export async function GET(_request: Request, ctx: Ctx) {
  const { id, adjunto } = await ctx.params;
  if (!UUID.test(id) || !UUID.test(adjunto)) return invalido();
  const res = await apiFetch<FeedbackReporteMaster>(`/platform/feedback/reports/${id}`);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  const a = res.data.adjuntos.find((x) => x.id === adjunto);
  if (!a || !MIMES_DE_ADJUNTO.has(a.mimetype)) return NextResponse.json({ error: "No existe ese adjunto." }, { status: 404 });

  let ruta: string;
  try {
    ruta = new URL(a.url).pathname;
  } catch {
    return NextResponse.json({ error: "El adjunto no tiene una URL válida." }, { status: 502 });
  }
  if (!RUTA_DE_ARCHIVO.test(ruta)) return NextResponse.json({ error: "El adjunto no tiene una URL válida." }, { status: 502 });
  const archivo = await fetch(`${API_BASE}${ruta}`, { cache: "no-store" }).catch(() => null);
  if (!archivo?.ok || !archivo.body) return NextResponse.json({ error: "No se pudo descargar el adjunto." }, { status: 502 });

  const nombre = (a.nombre_original ?? "adjunto").replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "adjunto";
  return new NextResponse(archivo.body, {
    status: 200,
    headers: {
      "Content-Type": a.mimetype,
      "Content-Disposition": `inline; filename="${nombre}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
