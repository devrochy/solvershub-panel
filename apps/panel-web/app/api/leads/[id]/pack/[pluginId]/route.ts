import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";
import type { LeadDetail } from "@/lib/api/types";

/** BFF: cambia los campos que un pack deja editar desde la ficha (estado e interés del lead, ADR-0149). */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string; pluginId: string }> }) {
  const { id, pluginId } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { valores?: unknown } | null;
  const valores = body?.valores;
  if (!valores || typeof valores !== "object" || Array.isArray(valores)) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }
  const res = await apiFetch<LeadDetail>(
    `/admin/leads/${encodeURIComponent(id)}/pack/${encodeURIComponent(pluginId)}`,
    { method: "PATCH", body: { valores } },
  );
  if (!res.ok) return NextResponse.json({ error: res.error, fields: res.fields }, { status: res.status });
  return NextResponse.json(res.data);
}
