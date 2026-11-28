import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { API_BASE, SESSION_COOKIE, TENANT_COOKIE } from "@/lib/api/server";
import { mensajeDeValidacion } from "@/lib/api/validacion";

/** Ids que viajan en la ruta del BFF: nunca se reenvía otra cosa al backend. */
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** La misma forma que exige la API para `Idempotency-Key`. */
export const CLAVE_DE_IDEMPOTENCIA = /^[A-Za-z0-9_.:-]{8,128}$/;

/**
 * BFF de los reportes de clientes (SPEC-54, HU-FB-05): reenvía a `/api/v1/feedback…` con la sesión y el negocio
 * de las cookies. Como el de conocimiento (`agent-knowledge/proxy.ts`), acepta multipart y en error conserva
 * `{error, code, details}`; además pasa `Idempotency-Key` hacia la API y `Retry-After` de vuelta (429 y 503),
 * para que el formulario diga cuándo reintentar.
 */
export async function reenviar(
  ruta: string,
  init: { method: "GET" | "POST"; body?: FormData; idempotencyKey?: string },
): Promise<Response> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value ?? null;
  const tenant = store.get(TENANT_COOKIE)?.value ?? null;
  if (!token) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/feedback${ruta}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(tenant ? { "X-Tenant-Id": tenant } : {}),
        ...(init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}),
      },
      body: init.body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "No se pudo contactar el backend." }, { status: 502 });
  }
  const retryAfter = res.headers.get("Retry-After");
  const headers = retryAfter && /^\d+$/.test(retryAfter.trim()) ? { "Retry-After": retryAfter.trim() } : undefined;
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (res.ok) return NextResponse.json(json ?? {}, { status: res.status });
  const error = json?.error && typeof json.error === "object" ? (json.error as Record<string, unknown>) : {};
  const mensaje =
    typeof error.message === "string"
      ? error.message
      : res.status === 422
        ? mensajeDeValidacion(json?.detail)
        : res.status === 413
          ? "Los adjuntos pesan demasiado."
          : "No se pudo completar la acción.";
  return NextResponse.json(
    {
      error: mensaje,
      ...(typeof error.code === "string" ? { code: error.code } : {}),
      ...(error.details && typeof error.details === "object" ? { details: error.details } : {}),
    },
    { status: res.status, headers },
  );
}

export function invalido(error = "Solicitud inválida.") {
  return NextResponse.json({ error }, { status: 400 });
}
