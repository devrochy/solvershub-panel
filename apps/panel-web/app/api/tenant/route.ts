import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE, TENANT_COOKIE, apiFetch } from "@/lib/api/server";
import type { Me } from "@/lib/api/types";

/** BFF: fija el negocio activo, validándolo contra la API antes de guardarlo. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { tenantId?: string } | null;
  if (!body?.tenantId) {
    return NextResponse.json({ error: "tenantId requerido." }, { status: 400 });
  }

  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? null;
  const res = await apiFetch<Me>("/admin/me", { token, tenant: body.tenantId });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  if (res.data.tenant?.id !== body.tenantId) {
    return NextResponse.json({ error: "No tienes acceso a ese negocio." }, { status: 403 });
  }

  const store = await cookies();
  store.set(TENANT_COOKIE, body.tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return NextResponse.json({ ok: true });
}
