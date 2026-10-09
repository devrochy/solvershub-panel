import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Referencia pública del pedido (p. ej. `SH-0012`); `sub:<uuid>` cuando no hubo pedido.
const REFERENCIA = /^[A-Za-z0-9:._-]{1,120}$/;

type Body = { action?: string } & Record<string, unknown>;

/**
 * BFF: controles del alta automática de un vendedor (master, HU-SH-07).
 * Acciones: `interruptor` (pausar/reanudar), `documento` (publicar una versión),
 * `aprobar` y `descartar` (un alta en revisión). El core valida el rol y la allowlist.
 */
export async function POST(request: Request, ctx: { params: Promise<{ vendedor: string }> }) {
  const { vendedor } = await ctx.params;
  if (!UUID.test(vendedor)) {
    return NextResponse.json({ error: "Vendedor inválido." }, { status: 400 });
  }
  const body = ((await request.json().catch(() => null)) ?? {}) as Body;
  const base = `/admin/platform/altas-automaticas/${vendedor}`;

  let res;
  switch (body.action) {
    case "interruptor":
      res = await apiFetch(`${base}/interruptor`, {
        method: "PUT",
        body: { pausado: body.pausado === true, motivo: typeof body.motivo === "string" ? body.motivo : null },
      });
      break;
    case "documento":
      res = await apiFetch(`${base}/documentos`, {
        method: "POST",
        body: { tipo: body.tipo, version: body.version, url: body.url },
      });
      break;
    case "aprobar":
    case "descartar": {
      const referencia = typeof body.referencia === "string" ? body.referencia : "";
      if (!REFERENCIA.test(referencia)) {
        return NextResponse.json({ error: "Referencia inválida." }, { status: 400 });
      }
      res = await apiFetch(`${base}/altas/${encodeURIComponent(referencia)}/${body.action}`, {
        method: "POST",
        body: body.action === "descartar" ? { motivo: body.motivo } : undefined,
      });
      break;
    }
    default:
      return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
