/**
 * Cliente del backend agent-core (lado servidor).
 *
 * El panel es un BFF: el navegador nunca ve el token. El token opaco de sesión
 * vive en una cookie `httpOnly` (`panel_session`) que setea `/api/session`, y aquí
 * se reenvía como `Authorization: Bearer` a la API `/api/v1` (ADR-0077).
 */
import { cookies } from "next/headers";

import { mensajeDeValidacion } from "@/lib/api/validacion";

export const API_BASE = (process.env.AGENT_CORE_API_URL ?? "http://localhost:8000").replace(
  /\/$/,
  "",
);

export const SESSION_COOKIE = "panel_session";
export const TENANT_COOKIE = "panel_tenant";

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | {
      ok: false;
      status: number;
      error: string;
      code?: string;
      fields?: Record<string, string>;
      /** Estado real que la API adjunta al error (`error.details`), p. ej. los bloqueos de un 409. */
      details?: Record<string, unknown>;
    };

type FetchOptions = {
  token?: string | null;
  /** Override del tenant activo (default: cookie `panel_tenant`). */
  tenant?: string | null;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Cabeceras extra (p. ej. `Idempotency-Key`, HU-CRM-06). */
  headers?: Record<string, string>;
};

export async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<ApiResult<T>> {
  const store = await cookies();
  const token = opts.token ?? store.get(SESSION_COOKIE)?.value ?? null;
  const tenant = opts.tenant !== undefined ? opts.tenant : (store.get(TENANT_COOKIE)?.value ?? null);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1${path}`, {
      method: opts.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(tenant ? { "X-Tenant-Id": tenant } : {}),
        ...(opts.headers ?? {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 502, error: "No se pudo contactar el backend." };
  }

  if (res.status === 204) return { ok: true, status: 204, data: undefined as T };

  const json = (await res.json().catch(() => null)) as
    | { error?: { code?: string; message?: string; fields?: unknown; details?: unknown }; detail?: unknown }
    | T
    | null;

  if (!res.ok) {
    const cuerpo = json as
      | { error?: { code?: string; message?: string; fields?: unknown; details?: unknown }; detail?: unknown }
      | null;
    const error = cuerpo?.error;
    // 422 de FastAPI: `detail` con mensajes en inglés; se traduce a qué campos revisar.
    const message =
      error?.message ?? (res.status === 422 ? mensajeDeValidacion(cuerpo?.detail) : `Error ${res.status}`);
    return {
      ok: false,
      status: res.status,
      error: message,
      ...(typeof error?.code === "string" ? { code: error.code } : {}),
      // Errores por campo (HU-FWK-08): el formulario los muestra junto a cada campo.
      ...(camposDeError(error?.fields) ? { fields: camposDeError(error?.fields) } : {}),
      ...(esObjeto(error?.details) ? { details: error.details } : {}),
    };
  }
  return { ok: true, status: res.status, data: json as T };
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return !!valor && typeof valor === "object" && !Array.isArray(valor);
}

/** `fields` del error de la API como `{campo: mensaje}` de textos, o undefined. */
function camposDeError(fields: unknown): Record<string, string> | undefined {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return undefined;
  const salida = Object.fromEntries(
    Object.entries(fields as Record<string, unknown>).filter(([, v]) => typeof v === "string"),
  ) as Record<string, string>;
  return Object.keys(salida).length > 0 ? salida : undefined;
}

export async function getSessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

/** Moneda del negocio activo (HU-UI-01). Default `COP` si no se puede leer. */
export async function getBusinessCurrency(): Promise<string> {
  const res = await apiFetch<{ identity?: { currency?: string } }>("/admin/settings");
  if (res.ok && res.data?.identity?.currency) return res.data.identity.currency;
  return "COP";
}
