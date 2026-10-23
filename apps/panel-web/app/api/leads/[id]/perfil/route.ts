import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";
import type { LeadDetail } from "@/lib/api/types";

/** BFF: datos base del cliente desde la pestaña General (tanda 1A). */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as
    | { valores?: unknown; otros?: unknown }
    | null;
  const valores = body?.valores;
  const otros = body?.otros ?? {};
  if (!valores || typeof valores !== "object" || Array.isArray(valores)) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }
  if (typeof otros !== "object" || Array.isArray(otros)) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }
  const res = await apiFetch<LeadDetail>(`/admin/leads/${encodeURIComponent(id)}/perfil`, {
    method: "PATCH",
    body: { valores, otros },
  });
  if (!res.ok) return NextResponse.json({ error: res.error, fields: res.fields }, { status: res.status });
  return NextResponse.json(res.data);
}
