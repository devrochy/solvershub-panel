import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

const ACTIONS = new Set(["activate", "deactivate", "retry"]);

/** BFF: activa/deshabilita/reintenta una habilidad para el tenant activo. */
export async function POST(request: Request, ctx: { params: Promise<{ pluginId: string }> }) {
  const { pluginId } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  const action = body?.action ?? "";
  if (!ACTIONS.has(action)) {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }

  const res = await apiFetch(`/admin/plugins/${encodeURIComponent(pluginId)}/action`, {
    method: "POST",
    body: { action },
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}

/** BFF: guarda la config de una habilidad reenviando el Bearer del panel. */
export async function PUT(request: Request, ctx: { params: Promise<{ pluginId: string }> }) {
  const { pluginId } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { values?: unknown } | null;
  if (!body || typeof body.values !== "object" || body.values === null) {
    return NextResponse.json({ error: { message: "Cuerpo inválido." } }, { status: 400 });
  }
  // `apiFetch` reenvía Authorization y X-Tenant-Id (cookie `panel_tenant`):
  // sin el tenant, la config se guardaba en el negocio equivocado (N-11).
  const res = await apiFetch(`/admin/plugins/${encodeURIComponent(pluginId)}/config`, {
    method: "PUT",
    body,
  });
  if (!res.ok) {
    return NextResponse.json({ error: { message: res.error } }, { status: res.status });
  }
  return NextResponse.json(res.data ?? { ok: true }, { status: res.status });
}
