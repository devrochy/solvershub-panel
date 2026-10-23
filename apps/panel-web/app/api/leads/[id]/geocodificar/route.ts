import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";
import type { LeadGeocodificacion } from "@/lib/api/types";

/** BFF: geocodifica la dirección del cliente y devuelve el perfil actualizado (HU-CRM-08). */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await apiFetch<LeadGeocodificacion>(`/admin/leads/${encodeURIComponent(id)}/geocodificar`, {
    method: "POST",
  });
  if (!res.ok) return NextResponse.json({ error: res.error, code: res.code }, { status: res.status });
  return NextResponse.json(res.data);
}
