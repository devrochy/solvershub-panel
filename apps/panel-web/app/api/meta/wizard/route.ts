import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/**
 * BFF del wizard de WhatsApp: estado, alta con Facebook (Embedded Signup), BYOK y carga manual.
 * El `code` del popup, el PIN y los tokens viajan solo hacia la API, nunca vuelven ni se guardan
 * aquí. Cada acción reenvía solo sus campos.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("session") === "1") {
    const env = url.searchParams.get("environment") === "sandbox" ? "sandbox" : "production";
    const res = await apiFetch(`/admin/meta/wizard/session?environment=${env}`);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
    return NextResponse.json(res.data ?? null);
  }
  const res = await apiFetch("/admin/meta/wizard");
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}

const RUTAS: Record<string, { path: string; campos: string[]; status: number }> = {
  session: { path: "/admin/meta/wizard/session", campos: ["environment", "restart"], status: 201 },
  cancel: {
    path: "/admin/meta/wizard/cancel",
    campos: ["wizard_id", "current_step", "error_message", "error_code", "error_id", "session_id"],
    status: 200,
  },
  exchange: {
    path: "/admin/meta/wizard/exchange",
    campos: ["wizard_id", "code", "attempt", "event_type", "waba_id", "phone_number_id", "business_id", "pin"],
    status: 200,
  },
  resume: { path: "/admin/meta/wizard/resume", campos: ["wizard_id", "pin"], status: 200 },
  number: { path: "/admin/meta/wizard/number", campos: ["wizard_id", "pin"], status: 200 },
  pin: { path: "/admin/meta/wizard/pin", campos: ["wizard_id", "pin"], status: 200 },
  byok: {
    path: "/admin/meta/wizard/byok",
    campos: ["app_id", "app_secret", "phone_number_id", "access_token", "waba_id", "verify_token", "environment", "pin"],
    status: 201,
  },
  manual: { path: "/admin/meta/manual", campos: ["waba_id", "phone_number_id", "token", "business_id"], status: 201 },
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const destino = RUTAS[String(body?.action ?? "")];
  if (!destino) return NextResponse.json({ error: "Acción inválida." }, { status: 400 });

  const payload: Record<string, unknown> = {};
  for (const campo of destino.campos) {
    const valor = body?.[campo];
    if (valor !== undefined && valor !== null) payload[campo] = valor;
  }
  const res = await apiFetch(destino.path, { method: "POST", body: payload });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data ?? { ok: true }, { status: destino.status });
}
