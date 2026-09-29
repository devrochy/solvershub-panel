import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF del wizard de WhatsApp: estado, sesión/exchange, BYOK y carga manual. */
export async function GET() {
  const res = await apiFetch("/admin/meta/wizard");
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { action?: string; [key: string]: unknown }
    | null;
  const action = String(body?.action ?? "");
  const rutas: Record<string, { path: string; method: "POST" }> = {
    session: { path: "/admin/meta/wizard/session", method: "POST" },
    exchange: { path: "/admin/meta/wizard/exchange", method: "POST" },
    number: { path: "/admin/meta/wizard/number", method: "POST" },
    pin: { path: "/admin/meta/wizard/pin", method: "POST" },
    byok: { path: "/admin/meta/wizard/byok", method: "POST" },
    manual: { path: "/admin/meta/manual", method: "POST" },
  };
  const destino = rutas[action];
  if (!destino) return NextResponse.json({ error: "Acción inválida." }, { status: 400 });

  const payload: Record<string, unknown> = { ...(body ?? {}) };
  delete payload.action;
  const res = await apiFetch(destino.path, { method: destino.method, body: payload });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data ?? { ok: true }, { status: 201 });
}
