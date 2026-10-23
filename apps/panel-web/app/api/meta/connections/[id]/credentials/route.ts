import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: datos de registro de una conexión Meta (secretos sin valor). */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await apiFetch(`/admin/meta/connections/${encodeURIComponent(id)}/credentials`);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}
