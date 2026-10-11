import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";
import type { SettingsResponse } from "@/lib/api/types";
import { identidadConPausa } from "@/lib/asistente";

/**
 * BFF: pausa o reactiva el asistente del negocio activo (HU-UI-03).
 *
 * El backend no tiene un endpoint solo para la pausa: `PUT /admin/settings/identity`
 * reescribe toda la identidad. Por eso se lee la configuración vigente y se reenvía
 * completa con `bot_paused` cambiado (`identidadConPausa`). El negocio sale de la cookie
 * `panel_tenant` vía `apiFetch` (X-Tenant-Id) y el permiso lo valida el backend.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { pausado?: unknown } | null;
  if (typeof body?.pausado !== "boolean") {
    return NextResponse.json({ error: "Indica si el asistente queda pausado." }, { status: 400 });
  }

  const actual = await apiFetch<SettingsResponse>("/admin/settings");
  if (!actual.ok) {
    return NextResponse.json({ error: actual.error }, { status: actual.status });
  }

  const res = await apiFetch("/admin/settings/identity", {
    method: "PUT",
    body: identidadConPausa(actual.data.identity, body.pausado),
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({ pausado: body.pausado });
}
