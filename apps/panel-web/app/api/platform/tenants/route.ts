import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";
import type { PlatformTenantPage } from "@/lib/api/types";

/**
 * BFF: negocios de la plataforma por nombre o slug (master), para el autocompletado del
 * campo de negocio en Colaboradores. Solo viaja lo que el campo necesita.
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const query = `page_size=20${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const res = await apiFetch<PlatformTenantPage>(`/admin/platform/tenants?${query}`);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({
    items: res.data.items.map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
  });
}

/** BFF: alta de negocio (master). */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.name) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  const res = await apiFetch("/admin/platform/tenants", { method: "POST", body });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json(res.data);
}
