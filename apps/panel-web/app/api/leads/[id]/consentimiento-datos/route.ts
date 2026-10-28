import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";
import type { ConsentimientoDatos } from "@/lib/aviso-datos";

/** BFF (HU-CRM-16): estado del cliente frente al aviso de tratamiento de datos. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await apiFetch<ConsentimientoDatos>(`/admin/leads/${encodeURIComponent(id)}/consentimiento-datos`);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}
