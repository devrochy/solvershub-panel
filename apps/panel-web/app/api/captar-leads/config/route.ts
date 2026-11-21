import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/**
 * BFF: guarda la config de Captar leads del negocio activo (HU-AOS-70, ADR-0193 §6): el intake del formulario de tu
 * página y los avisos de seguimiento. Los secretos vacíos conservan el guardado (lo resuelve el backend).
 */
export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as { values?: unknown } | null;
  if (!body || typeof body.values !== "object" || body.values === null) {
    return NextResponse.json({ error: { message: "Cuerpo inválido." } }, { status: 400 });
  }
  // `apiFetch` reenvía Authorization y X-Tenant-Id (cookie `panel_tenant`): la config es del negocio en curso.
  const res = await apiFetch("/admin/captar-leads/config", { method: "PUT", body: { values: body.values } });
  if (!res.ok) {
    return NextResponse.json({ error: { message: res.error } }, { status: res.status });
  }
  return NextResponse.json(res.data ?? { ok: true }, { status: res.status });
}
