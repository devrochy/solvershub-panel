import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: catálogo de tipos de conexión. */
export async function GET() {
  const res = await apiFetch("/admin/connections/catalog");
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json(res.data);
}
