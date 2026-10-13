import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { MENSAJE_DEL_CANJE, resultadoDelCanje } from "@/lib/acceso";
import { API_BASE, SESSION_COOKIE } from "@/lib/api/server";
import type { AcceptTesterInvitationResponse } from "@/lib/api/types";
import { clientIpHeaders } from "@/lib/client-ip";

/**
 * BFF del enlace de un tester (SPEC-30, HU-QA-04, ADR-0134): canjea el token, define la
 * contraseña y deja la sesión en una cookie `httpOnly`. El tester ve todos los negocios de
 * test: no se fija negocio activo, la API elige el primero.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: unknown; password?: unknown } | null;
  if (typeof body?.token !== "string" || typeof body?.password !== "string" || !body.token || !body.password) {
    return NextResponse.json({ error: "Faltan datos.", resultado: "error" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/auth/accept-tester-invitation`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...clientIpHeaders(request.headers) },
      body: JSON.stringify({ token: body.token, new_password: body.password }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "No se pudo contactar el servidor.", resultado: "error" }, { status: 502 });
  }

  const json = (await res.json().catch(() => null)) as Partial<AcceptTesterInvitationResponse> | null;
  if (!res.ok || !json?.token) {
    const status = res.ok ? 502 : res.status;
    const resultado = resultadoDelCanje(status);
    const error =
      resultado === "enlace_invalido"
        ? "El enlace no es válido, ya se usó o venció. Pide uno nuevo a quien te invitó."
        : MENSAJE_DEL_CANJE[resultado];
    return NextResponse.json({ error, resultado }, { status });
  }

  const store = await cookies();
  const anterior = store.get(SESSION_COOKIE)?.value;
  if (anterior && anterior !== json.token) {
    await fetch(`${API_BASE}/api/v1/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${anterior}` },
      cache: "no-store",
    }).catch(() => {});
  }
  store.set(SESSION_COOKIE, json.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: json.expires_in ?? 60 * 60 * 24 * 7,
  });
  return NextResponse.json({ ok: true });
}
