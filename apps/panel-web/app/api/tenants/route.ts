import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";
import type { TenantPage } from "@/lib/api/types";

/** BFF: busca negocios del admin para el selector de tenant. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const query = `page_size=20${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const res = await apiFetch<TenantPage>(`/admin/tenants?${query}`);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json(res.data);
}
