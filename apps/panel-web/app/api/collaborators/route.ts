import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/**
 * BFF: alta de colaborador. Devuelve lo que respondió la API (`{resultado: "creado" |
 * "invitado"}`): el diálogo avisa distinto si el correo ya tenía cuenta y solo se envió la
 * invitación (antes se descartaba y el aviso nunca aparecía).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "Email y contraseña son obligatorios." }, { status: 400 });
  }
  const res = await apiFetch<{ resultado?: string }>("/admin/collaborators", { method: "POST", body });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({ ok: true, ...(res.data ?? {}) });
}
