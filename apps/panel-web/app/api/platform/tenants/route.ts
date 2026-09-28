import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

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
