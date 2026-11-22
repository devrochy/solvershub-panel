import { NextResponse } from "next/server";

import { responder } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";

/**
 * BFF del alta de Instagram (HU-CHAN-04, ADR-0152): estado, intento del popup, descubrimiento de cuentas,
 * conexión e Instagram Login. El `code`, el `state` y el intento viajan solo hacia la API y no se guardan aquí; los
 * tokens nunca llegan al navegador. Cada acción reenvía solo sus campos.
 */
export async function GET() {
  return responder(await apiFetch("/admin/meta/instagram"));
}

const RUTAS: Record<string, { path: string; campos: string[] }> = {
  attempt: { path: "/admin/meta/instagram/attempt", campos: [] },
  discover: { path: "/admin/meta/instagram/discover", campos: ["code", "attempt"] },
  connect: { path: "/admin/meta/instagram/connect", campos: ["connection_id", "ig_user_ids"] },
  // Instagram Login (ruta b): `login_start` da la dirección de Instagram; `login_complete` canjea el código del retorno.
  login_start: { path: "/admin/meta/instagram/login/start", campos: [] },
  login_complete: { path: "/admin/meta/instagram/login/complete", campos: ["code", "state"] },
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
  const res = await apiFetch(destino.path, { method: "POST", body: destino.campos.length ? payload : undefined });
  // En error reenvía `code` y `details`: el plan puede no incluir Instagram (`plan_channel_not_included`).
  return responder(res, (data) => data ?? { ok: true });
}
