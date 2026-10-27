import { NextResponse } from "next/server";

import { invalido, responder } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import type { SettingsResponse } from "@/lib/api/types";
import { cuerpoIdentidad } from "@/lib/asistente";
import type { CambiosDeIdentidad } from "@/lib/onboarding";

/** Lo único que el asistente puede cambiar de Identidad: el resto se conserva tal cual está guardado. */
const CLAVES: (keyof CambiosDeIdentidad)[] = [
  "assistant_name",
  "business_description",
  "persona_tone",
  "persona_warmth",
  "persona_emojis",
  "persona_max_length",
  "persona_forbidden",
  "escalation_keywords",
  "business_ranges",
  "business_hours_mode",
];

/**
 * BFF: guarda los cambios de un paso del asistente en Configuración › Identidad. `PUT /settings/identity`
 * reemplaza todo, así que se lee lo guardado, se aplican solo las claves permitidas y se reenvía completo.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { cambios?: Record<string, unknown> } | null;
  const crudos = body?.cambios;
  if (!crudos || typeof crudos !== "object" || Array.isArray(crudos)) return invalido();
  const cambios = Object.fromEntries(Object.entries(crudos).filter(([clave]) => (CLAVES as string[]).includes(clave)));
  if (Object.keys(cambios).length === 0) return NextResponse.json({ ok: true });

  const actual = await apiFetch<SettingsResponse>("/admin/settings");
  if (!actual.ok) return responder(actual);
  const identidad = actual.data.identity;
  const res = await apiFetch("/admin/settings/identity", {
    method: "PUT",
    body: cuerpoIdentidad({ ...identidad, ...cambios }, identidad),
  });
  return responder(res, () => ({ ok: true }));
}
