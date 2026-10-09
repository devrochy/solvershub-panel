import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: checklist de producción de una conexión (HU-CONN-07). GET lee lo guardado; POST encola. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await apiFetch(`/admin/meta/connections/${encodeURIComponent(id)}/production`);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await apiFetch(`/admin/meta/connections/${encodeURIComponent(id)}/production/run`, {
    method: "POST",
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data, { status: 202 });
}
