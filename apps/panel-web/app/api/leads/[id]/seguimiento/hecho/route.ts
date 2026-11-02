import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/**
 * BFF: marca como hecho el seguimiento del lead del cliente y, si llegan `siguiente_en` y `siguiente_nota`,
 * programa el siguiente en el mismo gesto (HU-CRM-21). `siguiente_en` va sin zona: es hora del negocio.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { siguiente_en?: unknown; siguiente_nota?: unknown };
  const cuerpo: { siguiente_en?: string; siguiente_nota?: string } = {};
  if (typeof body.siguiente_en === "string" && body.siguiente_en.trim()) cuerpo.siguiente_en = body.siguiente_en.trim();
  if (typeof body.siguiente_nota === "string" && body.siguiente_nota.trim()) cuerpo.siguiente_nota = body.siguiente_nota.trim();
  const res = await apiFetch<unknown>(`/pack/commerce/leads/${encodeURIComponent(id)}/seguimiento/hecho`, {
    method: "POST",
    body: cuerpo,
  });
  if (!res.ok) return NextResponse.json({ error: res.error, fields: res.fields }, { status: res.status });
  return NextResponse.json({ ok: true });
}
