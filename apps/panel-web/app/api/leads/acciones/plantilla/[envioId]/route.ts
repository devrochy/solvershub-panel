import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";
import type { EnvioSegmento } from "@/lib/api/types";

/** BFF (HU-CRM-06): estado de un envío a un segmento. */
export async function GET(_request: Request, ctx: { params: Promise<{ envioId: string }> }) {
  const { envioId } = await ctx.params;
  const res = await apiFetch<EnvioSegmento>(`/admin/leads/acciones/plantilla/${encodeURIComponent(envioId)}`);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}

/** BFF: confirma el envío. La clave de idempotencia la genera el diálogo una vez por vista previa. */
export async function POST(request: Request, ctx: { params: Promise<{ envioId: string }> }) {
  const { envioId } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { clave?: unknown } | null;
  const clave = typeof body?.clave === "string" ? body.clave : "";
  if (clave.length < 8 || clave.length > 200) {
    return NextResponse.json({ error: "Falta la clave del envío." }, { status: 400 });
  }
  const res = await apiFetch<EnvioSegmento>(
    `/admin/leads/acciones/plantilla/${encodeURIComponent(envioId)}/confirmar`,
    { method: "POST", headers: { "Idempotency-Key": clave } },
  );
  if (!res.ok) return NextResponse.json({ error: res.error, code: res.code }, { status: res.status });
  return NextResponse.json(res.data, { status: 202 });
}
