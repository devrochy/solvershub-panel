import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";
import type { LeadGeocodificacionInversa } from "@/lib/api/types";

/** BFF: propone una dirección a partir de un punto del mapa. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as
    | { latitud?: unknown; longitud?: unknown }
    | null;
  if (typeof body?.latitud !== "number" || typeof body?.longitud !== "number") {
    return NextResponse.json({ error: "Coordenadas inválidas." }, { status: 400 });
  }
  const res = await apiFetch<LeadGeocodificacionInversa>(
    `/admin/leads/${encodeURIComponent(id)}/geocodificar/reverso`,
    { method: "POST", body: { latitud: body.latitud, longitud: body.longitud } },
  );
  if (!res.ok) return NextResponse.json({ error: res.error, code: res.code }, { status: res.status });
  return NextResponse.json(res.data);
}
