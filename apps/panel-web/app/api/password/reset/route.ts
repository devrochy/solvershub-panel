import { NextResponse } from "next/server";

import { mensajeDelReset, normalizarCodigo } from "@/lib/acceso";
import { API_BASE } from "@/lib/api/server";
import { clientIpHeaders } from "@/lib/client-ip";

/** BFF: aplica el código de recuperación con la contraseña nueva (ADR-0098). */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    code?: unknown;
    password?: unknown;
    identifier?: unknown;
  } | null;
  if (typeof body?.code !== "string" || typeof body?.password !== "string" || !body.code || !body.password) {
    return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...clientIpHeaders(request.headers) },
      // Con el correo, la API busca el código solo entre los de esa cuenta (y bloquea por ella).
      body: JSON.stringify({
        token: normalizarCodigo(body.code),
        new_password: body.password,
        identifier: typeof body.identifier === "string" && body.identifier.trim() ? body.identifier.trim() : undefined,
      }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "No se pudo contactar el servidor." }, { status: 502 });
  }
  if (!res.ok) {
    return NextResponse.json({ error: mensajeDelReset(res.status) }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
