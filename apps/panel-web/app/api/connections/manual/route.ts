import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: alta/edición de una conexión manual. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.type_id) {
    return NextResponse.json({ error: "Falta el tipo de conexión." }, { status: 400 });
  }
  const res = await apiFetch("/admin/connections/manual", { method: "POST", body });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
