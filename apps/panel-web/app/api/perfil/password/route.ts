import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: cambia la contraseña propia (pide la actual). */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const res = await apiFetch("/admin/me/password", { method: "POST", body });
  if (!res.ok) {
    return NextResponse.json({ error: res.error, ...(res.code ? { code: res.code } : {}) }, { status: res.status });
  }
  return new Response(null, { status: 204 });
}
