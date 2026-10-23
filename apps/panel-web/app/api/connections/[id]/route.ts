import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

const CHANNEL_ACTIONS = new Set(["activate", "deactivate", "primary", "delete"]);
const META_ACTIONS = new Set(["activate", "deactivate", "delete"]);

/** BFF: estado de una conexión (canal manual o conexión de Meta). */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as
    | { action?: string; kind?: string; password?: string }
    | null;
  const action = body?.action ?? "";
  const isMeta = body?.kind === "meta_connection";
  const valid = isMeta ? META_ACTIONS : CHANNEL_ACTIONS;
  if (!valid.has(action)) {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }
  const path = isMeta
    ? `/admin/meta/connections/${id}/action`
    : `/admin/connections/${id}/action`;
  const res = await apiFetch(path, {
    method: "POST",
    body: { action, ...(body?.password ? { password: body.password } : {}) },
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
