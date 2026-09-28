import { NextResponse } from "next/server";

import { API_BASE, apiFetch, getSessionToken } from "@/lib/api/server";

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
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ error: { message: "Sesión requerida." } }, { status: 401 });
  }

  const body = await request.text();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/admin/plugins/${encodeURIComponent(pluginId)}/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: { message: "No se pudo contactar el backend." } }, { status: 502 });
  }

  const json = await res.json().catch(() => null);
  return NextResponse.json(json ?? {}, { status: res.status });
}
