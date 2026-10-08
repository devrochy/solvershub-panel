import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { API_BASE, SESSION_COOKIE, TENANT_COOKIE } from "@/lib/api/server";
import { clientIpHeaders } from "@/lib/client-ip";

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
