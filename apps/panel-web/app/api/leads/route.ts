import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";
import type { LeadCreado } from "@/lib/api/types";

/** BFF: alta manual de un cliente con su lead (panel › Clientes › Nuevo lead). */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const res = await apiFetch<LeadCreado>("/admin/leads", { method: "POST", body });
  if (!res.ok) {
    return NextResponse.json(
      { error: res.error, code: res.code, fields: res.fields, details: res.details },
      { status: res.status },
    );
  }
  return NextResponse.json(res.data, { status: res.status });
}
