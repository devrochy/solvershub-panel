import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/**
 * BFF: registra la suscripción de APP de UNA conexión (HU-CONN-05). En una BYOK, la app de esa
 * conexión; en una de la app de la plataforma, solo el master (el backend responde 403 al resto).
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { connection_id?: string } | null;
  const connectionId = body?.connection_id ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(connectionId)) {
    return NextResponse.json({ error: "Falta la conexión." }, { status: 400 });
  }
  const res = await apiFetch(`/admin/meta/connections/${connectionId}/webhook/register`, {
    method: "POST",
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
