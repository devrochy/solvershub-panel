import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF de la bandeja de fallos (DLQ): lista los eventos fallidos del negocio. */
export async function GET() {
  const res = await apiFetch("/admin/dlq");
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json(res.data);
}
