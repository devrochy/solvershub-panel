import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";
import type { BotPausedState, BotPausedUpdate } from "@/lib/api/types";

/**
 * BFF: pausa o reactiva el asistente del negocio activo (HU-UI-03).
 *
 * Usa `PUT /admin/settings/bot-paused`, que cambia solo `bot_paused`: no reenvía la
 * identidad, así que no pisa lo que otra persona esté editando en Configuración. El
 * negocio sale de la cookie `panel_tenant` vía `apiFetch` (X-Tenant-Id) y el permiso lo
 * valida el backend.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { pausado?: unknown } | null;
  if (typeof body?.pausado !== "boolean") {
    return NextResponse.json({ error: "Indica si el asistente queda pausado." }, { status: 400 });
  }

  const cuerpo: BotPausedUpdate = { paused: body.pausado };
  const res = await apiFetch<BotPausedState>("/admin/settings/bot-paused", { method: "PUT", body: cuerpo });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({ pausado: res.data.paused });
}
