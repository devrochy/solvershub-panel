import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF de eventos de dominio: reintenta un evento fallido (ADR-0107). */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await apiFetch(`/admin/domain-events/${encodeURIComponent(id)}/retry`, {
    method: "POST",
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
