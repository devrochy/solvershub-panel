import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/**
 * BFF de una automatización del negocio (ADR-0200): reenvía el Bearer y el `X-Tenant-Id` de la
 * sesión. El backend valida la sección `automatizaciones` (write) y el catálogo; aquí no se
 * duplica esa regla.
 */
export async function PUT(request: Request, ctx: { params: Promise<{ cron: string }> }) {
  const { cron } = await ctx.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: { message: "Cuerpo inválido." } }, { status: 400 });
  }
  const res = await apiFetch(`/admin/automatizaciones/${encodeURIComponent(cron)}`, {
    method: "PUT",
    body,
  });
  if (!res.ok) {
    return NextResponse.json({ error: { message: res.error } }, { status: res.status });
  }
  return NextResponse.json(res.data ?? { ok: true }, { status: res.status });
}
