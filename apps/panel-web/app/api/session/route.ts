import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { API_BASE, SESSION_COOKIE, TENANT_COOKIE, apiFetch } from "@/lib/api/server";
import type { Me } from "@/lib/api/types";
import { clientIpHeaders } from "@/lib/client-ip";

/**
 * Sesión vigente, tal como la ve la API ahora mismo (permisos, rol y negocio activo). La
 * pide el shell en cada navegación para no quedarse con un snapshot: si la sesión ya no
 * vale (cuenta desactivada o sesión invalidada: 401; negocio suspendido: 403
 * `tenant_suspended`), se borran las cookies y el navegador vuelve a /login; si el negocio guardado ya no es accesible, se
 * olvida y se responde con el negocio que la API elija.
 */
export async function GET() {
  const store = await cookies();
  let res = await apiFetch<Me>("/admin/me");
  if (!res.ok && res.status === 403 && res.code !== "tenant_suspended" && store.get(TENANT_COOKIE)?.value) {
    res = await apiFetch<Me>("/admin/me", { tenant: null });
    if (res.ok) store.delete(TENANT_COOKIE);
  }
  if (!res.ok) {
    if (res.status === 401 || res.code === "tenant_suspended") {
      store.delete(SESSION_COOKIE);
      store.delete(TENANT_COOKIE);
    }
    return NextResponse.json({ error: res.error, code: res.code }, { status: res.status });
  }
  return NextResponse.json(res.data, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { identifier?: string; password?: string }
    | null;
  if (!body?.identifier || !body?.password) {
    return NextResponse.json({ error: "Faltan credenciales." }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: "POST",
      // La IP del usuario: sin ella la API vería a todos con la del panel y el
      // bloqueo de login los bloquearía juntos (HU-ARCH-04).
      headers: { "Content-Type": "application/json", ...clientIpHeaders(request.headers) },
      body: JSON.stringify({ identifier: body.identifier, password: body.password }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "No se pudo contactar el backend." }, { status: 502 });
  }

  const json = (await res.json().catch(() => null)) as
    | { token?: string; expires_in?: number; error?: { message?: string } }
    | null;
  if (!res.ok || !json?.token) {
    return NextResponse.json(
      { error: json?.error?.message ?? "No se pudo iniciar sesión." },
      { status: res.status },
    );
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, json.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: json.expires_in ?? 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await fetch(`${API_BASE}/api/v1/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => {});
  }
  store.delete(SESSION_COOKIE);
  store.delete(TENANT_COOKIE);
  return NextResponse.json({ ok: true });
}
