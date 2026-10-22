import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { API_BASE, SESSION_COOKIE, TENANT_COOKIE } from "@/lib/api/server";

/** BFF: sirve la foto de un colaborador (mismo origen, sin CSP) con la sesión del panel. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  const tenant = store.get(TENANT_COOKIE)?.value;
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (tenant) headers["X-Tenant-Id"] = tenant;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/admin/collaborators/${encodeURIComponent(id)}/avatar`, {
      headers,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "No se pudo contactar el backend." }, { status: 502 });
  }
  if (!res.ok) return new Response(null, { status: res.status });
  return new Response(res.body, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "image/png",
      "Cache-Control": "private, max-age=60",
    },
  });
}
