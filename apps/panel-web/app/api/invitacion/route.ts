import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { MENSAJE_DEL_CANJE, resultadoDelCanje } from "@/lib/acceso";
import { guardarNegocioActivo } from "@/lib/api/negocio-activo";
import { API_BASE, SESSION_COOKIE } from "@/lib/api/server";
import type { AcceptInvitationResponse } from "@/lib/api/types";
import { clientIpHeaders } from "@/lib/client-ip";

/**
 * BFF del enlace de invitación (HU-SH-06, ADR-0121/0124): canjea el token, define la
 * contraseña y deja la sesión y el negocio activo en cookies `httpOnly`. El navegador nunca
 * ve el token de sesión. Los errores salen en lenguaje claro, sin detalles de la cuenta.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: unknown; password?: unknown } | null;
  if (typeof body?.token !== "string" || typeof body?.password !== "string" || !body.token || !body.password) {
    return NextResponse.json({ error: "Faltan datos.", resultado: "error" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/auth/accept-invitation`, {
      method: "POST",
      // La IP del usuario para el bloqueo progresivo (igual que el login, HU-ARCH-04).
      headers: { "Content-Type": "application/json", ...clientIpHeaders(request.headers) },
      body: JSON.stringify({ token: body.token, new_password: body.password }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "No se pudo contactar el servidor.", resultado: "error" }, { status: 502 });
  }

  const json = (await res.json().catch(() => null)) as Partial<AcceptInvitationResponse> | null;
  if (!res.ok || !json?.token || !json.tenant_id) {
    const status = res.ok ? 502 : res.status;
    const resultado = resultadoDelCanje(status);
    return NextResponse.json({ error: MENSAJE_DEL_CANJE[resultado], resultado }, { status });
  }

  const store = await cookies();
  // Si en este navegador había otra sesión, se cierra en la API antes de reemplazarla: si no,
  // seguiría viva aunque la cookie ya no la nombre.
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
  // El negocio al que entró queda activo: llega directo a su Resumen.
  await guardarNegocioActivo(json.tenant_id);
  return NextResponse.json({ ok: true });
}
