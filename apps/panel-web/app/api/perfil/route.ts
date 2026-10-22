import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: actualiza el perfil propio (nombre, teléfono y usuario). */
export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const res = await apiFetch("/admin/me", { method: "PATCH", body });
  if (!res.ok) {
    return NextResponse.json({ error: res.error, ...(res.code ? { code: res.code } : {}) }, { status: res.status });
  }
  return NextResponse.json(res.data);
}
