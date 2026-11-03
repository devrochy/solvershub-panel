import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { TENANT_COOKIE, apiFetch } from "@/lib/api/server";
import type { RetiredReferencesReport } from "@/lib/api/types";
import { esUuid } from "@/lib/referencias-retiradas";

type Ctx = { params: Promise<{ id: string }> };

/**
 * BFF: referencias retiradas de un negocio, solo lectura (master, HU-AOS-59). La API rechaza un
 * `X-Tenant-Id` suspendido: si el negocio activo es el mismo, no se manda.
 */
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!esUuid(id)) return NextResponse.json({ error: "Negocio inválido." }, { status: 400 });
  const activo = (await cookies()).get(TENANT_COOKIE)?.value;
  const res = await apiFetch<RetiredReferencesReport>(`/admin/platform/tenants/${id}/retired-references`, {
    ...(activo === id ? { tenant: null } : {}),
  });
  return res.ok
    ? NextResponse.json(res.data)
    : NextResponse.json({ error: res.error, ...(res.code ? { code: res.code } : {}) }, { status: res.status });
}
