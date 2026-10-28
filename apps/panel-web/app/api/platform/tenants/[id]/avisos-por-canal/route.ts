import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { TENANT_COOKIE, apiFetch } from "@/lib/api/server";
import type { AvisosPorCanalBandera } from "@/lib/api/types";
import { UUID, cuerpoValido } from "@/lib/avisos-por-canal-bandera";

type Ctx = { params: Promise<{ id: string }> };

/** La API rechaza un `X-Tenant-Id` suspendido: si el negocio activo es el mismo, no se manda. */
async function sinTenantSiEsElMismo(id: string): Promise<{ tenant?: null }> {
  const activo = (await cookies()).get(TENANT_COOKIE)?.value;
  return activo === id ? { tenant: null } : {};
}

function error(res: { status: number; error: string; code?: string }) {
  return NextResponse.json({ error: res.error, code: res.code }, { status: res.status });
}

/** BFF: bandera de los avisos por canal de un negocio (solo master, ADR-0178 D2). */
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Negocio inválido." }, { status: 400 });
  const res = await apiFetch<AvisosPorCanalBandera>(
    `/admin/platform/tenants/${id}/avisos-por-canal`,
    await sinTenantSiEsElMismo(id),
  );
  return res.ok ? NextResponse.json(res.data) : error(res);
}

/** Enciende o apaga (idempotente, auditado por la API). Solo `{habilitada}` llega a la API. */
export async function PUT(request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Negocio inválido." }, { status: 400 });
  const cuerpo = cuerpoValido(await request.json().catch(() => null));
  if (!cuerpo) return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  const res = await apiFetch<AvisosPorCanalBandera>(`/admin/platform/tenants/${id}/avisos-por-canal`, {
    method: "PUT",
    body: cuerpo,
    ...(await sinTenantSiEsElMismo(id)),
  });
  // Sin caché que invalidar: las páginas del editor son dinámicas (cookies) y leen con `no-store`, y el
  // caché del navegador para páginas dinámicas es de 0 s. El cliente hace `router.refresh()` al terminar.
  return res.ok ? NextResponse.json(res.data) : error(res);
}
