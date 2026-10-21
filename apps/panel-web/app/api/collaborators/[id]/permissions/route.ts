import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: acceso efectivo por sección (y si es heredado) de un colaborador, para la grilla (HU-UI-10). */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const tenant = new URL(request.url).searchParams.get("tenant") ?? "";
  const query = tenant ? `?tenant=${encodeURIComponent(tenant)}` : "";
  const res = await apiFetch(`/admin/collaborators/${id}/permissions${query}`);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json(res.data);
}
