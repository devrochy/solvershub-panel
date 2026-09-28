import { NextResponse } from "next/server";

import { API_BASE, apiFetch } from "@/lib/api/server";

/**
 * BFF genérico para la API admin de packs (ADR-0079).
 * `/api/pack/<pack>/<...>` → `agent-core/api/v1/pack/<pack>/<...>` con Bearer y
 * X-Tenant-Id del panel. Evita una ruta BFF por acción de cada pack.
 */
async function proxy(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const url = new URL(request.url);
  // `apiFetch` ya antepone `/api/v1`.
  const target = `/pack/${(path ?? []).join("/")}${url.search}`;

  let res;
  if (request.method === "GET") {
    res = await apiFetch(target);
  } else {
    const body = await request.json().catch(() => undefined);
    res = await apiFetch(target, {
      method: request.method as "POST" | "PUT" | "PATCH" | "DELETE",
      body,
    });
  }
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  // Se propaga el status de la API (201 al crear, 204 sin cuerpo).
  if (res.status === 204) {
    return new NextResponse(null, { status: 204 });
  }
  return NextResponse.json(res.data ?? { ok: true }, { status: res.status });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;

// Referencia a API_BASE para dejar explícito que el proxy usa el backend del panel.
void API_BASE;
