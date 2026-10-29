import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { API_BASE, SESSION_COOKIE, TENANT_COOKIE, apiFetch } from "@/lib/api/server";

async function cabeceras(): Promise<Record<string, string> | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tenant = store.get(TENANT_COOKIE)?.value;
  return { Authorization: `Bearer ${token}`, ...(tenant ? { "X-Tenant-Id": tenant } : {}) };
}

/** BFF del avatar del cliente. El POST reenvía el multipart tal cual. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const headers = await cabeceras();
  if (!headers) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  const tipo = request.headers.get("content-type");
  if (tipo) headers["Content-Type"] = tipo;
  const res = await fetch(`${API_BASE}/api/v1/admin/leads/${encodeURIComponent(id)}/avatar`, {
    method: "POST",
    headers,
    body: await request.arrayBuffer(),
    cache: "no-store",
  }).catch(() => null);
  if (!res) return NextResponse.json({ error: "No se pudo contactar el backend." }, { status: 502 });
  const json = (await res.json().catch(() => null)) as { error?: string | { message?: string } } | null;
  if (!res.ok) {
    const error = typeof json?.error === "string" ? json.error : json?.error?.message;
    return NextResponse.json({ error: error ?? "No se pudo subir la foto." }, { status: res.status });
  }
  return NextResponse.json(json ?? {});
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await apiFetch(`/admin/leads/${encodeURIComponent(id)}/avatar`, { method: "DELETE" });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return new Response(null, { status: 204 });
}
