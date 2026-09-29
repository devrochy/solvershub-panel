import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: plantillas de una conexión Meta (listar, sincronizar, eliminar). */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await apiFetch(`/admin/meta/connections/${id}/templates`);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json(res.data);
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as
    | { action?: string; template_id?: string; [key: string]: unknown }
    | null;
  const action = body?.action ?? "";
  if (action === "create") {
    const payload: Record<string, unknown> = { ...(body ?? {}) };
    delete payload.action;
    const res = await apiFetch(`/admin/meta/connections/${id}/templates`, {
      method: "POST",
      body: payload,
    });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
    return NextResponse.json({ ok: true }, { status: 201 });
  }
  if (action === "sync") {
    const res = await apiFetch(`/admin/meta/connections/${id}/templates/sync`, { method: "POST" });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
    return NextResponse.json({ ok: true });
  }
  if (action === "delete" && body?.template_id) {
    const res = await apiFetch(
      `/admin/meta/connections/${id}/templates/${encodeURIComponent(body.template_id)}/delete`,
      { method: "POST" },
    );
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
}
