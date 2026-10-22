import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { API_BASE, SESSION_COOKIE, TENANT_COOKIE, apiFetch } from "@/lib/api/server";

/** Cabeceras de reenvío con la sesión del panel. */
async function cabeceras(): Promise<Record<string, string> | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tenant = store.get(TENANT_COOKIE)?.value;
  return { Authorization: `Bearer ${token}`, ...(tenant ? { "X-Tenant-Id": tenant } : {}) };
}

/** GET: sirve la foto del usuario desde el backend (mismo origen, sin CSP). */
export async function GET() {
  const headers = await cabeceras();
  if (!headers) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/admin/me/avatar`, { headers, cache: "no-store" });
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

/**
 * BFF de la foto de perfil. El POST reenvía el multipart tal cual (no se puede JSON-stringify);
 * el DELETE usa `apiFetch`.
 */
export async function POST(request: Request) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  const tenant = store.get(TENANT_COOKIE)?.value;
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (tenant) headers["X-Tenant-Id"] = tenant;
  const tipo = request.headers.get("content-type");
  if (tipo) headers["Content-Type"] = tipo;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/admin/me/avatar`, {
      method: "POST",
      headers,
      body: await request.arrayBuffer(),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "No se pudo contactar el backend." }, { status: 502 });
  }
  const json = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) {
    return NextResponse.json({ error: json?.error ?? "No se pudo subir la foto." }, { status: res.status });
  }
  return NextResponse.json(json ?? {});
}

export async function DELETE() {
  const res = await apiFetch("/admin/me/avatar", { method: "DELETE" });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return new Response(null, { status: 204 });
}
