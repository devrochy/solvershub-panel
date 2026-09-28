import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: alta de colaborador. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "Email y contraseña son obligatorios." }, { status: 400 });
  }
  const res = await apiFetch("/admin/collaborators", { method: "POST", body });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
