import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: consulta (solo lectura) los créditos de una conexión de Meta. */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await apiFetch(`/admin/costs/meta/credits/${encodeURIComponent(id)}/verify`, {
    method: "POST",
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json(res.data);
}
