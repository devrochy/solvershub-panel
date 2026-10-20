import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { API_BASE, SESSION_COOKIE, TENANT_COOKIE } from "@/lib/api/server";
import { mensajeDeValidacion } from "@/lib/api/validacion";

/** Ids que viajan en la ruta del BFF: nunca se reenvía otra cosa al backend. */
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * BFF del conocimiento del agente (HU-AOS-49): reenvía a
 * `/api/v1/pack/pack_knowledge/agents/{id}/documents…` con la sesión y el negocio de las cookies.
 * Acepta multipart (la subida) además de JSON, y en error conserva `{error, code, details}` de la
 * API para que el panel distinga un tope del plan o un archivo repetido.
 */
export async function reenviar(
  ruta: string,
  init: { method: "GET" | "POST" | "DELETE"; body?: FormData },
): Promise<Response> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value ?? null;
  const tenant = store.get(TENANT_COOKIE)?.value ?? null;
  if (!token) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/pack/pack_knowledge${ruta}`, {
      method: init.method,
      headers: { Authorization: `Bearer ${token}`, ...(tenant ? { "X-Tenant-Id": tenant } : {}) },
      body: init.body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "No se pudo contactar el backend." }, { status: 502 });
  }
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (res.ok) return NextResponse.json(json ?? {}, { status: res.status });
  const error = json?.error && typeof json.error === "object" ? (json.error as Record<string, unknown>) : {};
  const mensaje =
    typeof error.message === "string"
      ? error.message
      : res.status === 422
        ? mensajeDeValidacion(json?.detail)
        : "No se pudo completar la acción.";
  return NextResponse.json(
    {
      error: mensaje,
      ...(typeof error.code === "string" ? { code: error.code } : {}),
      ...(error.details && typeof error.details === "object" ? { details: error.details } : {}),
    },
    { status: res.status },
  );
}

export function invalido() {
  return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
}
