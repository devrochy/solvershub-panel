import { NextResponse } from "next/server";

import { responder } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";

/** BFF: lista o agrega números de una conexión Meta. En error reenvía `code` y `details` (409 del plan). */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return responder(await apiFetch(`/admin/meta/connections/${id}/numbers`));
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  if (!body?.cc || !body?.phone_number || !body?.verified_name) {
    return NextResponse.json({ error: "Faltan campos del número." }, { status: 400 });
  }
  const res = await apiFetch(`/admin/meta/connections/${id}/numbers`, { method: "POST", body });
  return responder(res, () => ({ ok: true }));
}
