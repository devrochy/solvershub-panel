import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: lista o agrega números de una conexión Meta. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await apiFetch(`/admin/meta/connections/${id}/numbers`);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json(res.data);
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  if (!body?.cc || !body?.phone_number || !body?.verified_name) {
    return NextResponse.json({ error: "Faltan campos del número." }, { status: 400 });
  }
  const res = await apiFetch(`/admin/meta/connections/${id}/numbers`, { method: "POST", body });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
