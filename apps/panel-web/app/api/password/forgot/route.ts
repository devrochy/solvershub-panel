import { NextResponse } from "next/server";

import { API_BASE } from "@/lib/api/server";
import { clientIpHeaders } from "@/lib/client-ip";

/**
 * BFF: pide el código de recuperación (ADR-0098). La API responde siempre igual, exista o no
 * la cuenta; el panel también, para no revelar qué correos tienen cuenta.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { identifier?: unknown } | null;
  const identifier = typeof body?.identifier === "string" ? body.identifier.trim() : "";
  if (!identifier) {
    return NextResponse.json({ error: "Escribe tu correo." }, { status: 400 });
  }
  try {
    await fetch(`${API_BASE}/api/v1/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...clientIpHeaders(request.headers) },
      body: JSON.stringify({ identifier }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "No se pudo contactar el servidor." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
