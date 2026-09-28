/**
 * Cliente del backend agent-core (lado servidor).
 *
 * El panel es un BFF: el navegador nunca ve el token. El token opaco de sesión
 * vive en una cookie `httpOnly` (`panel_session`) que setea `/api/session`, y aquí
 * se reenvía como `Authorization: Bearer` a la API `/api/v1` (ADR-0077).
 */
import { cookies } from "next/headers";

export const API_BASE = (process.env.AGENT_CORE_API_URL ?? "http://localhost:8000").replace(
  /\/$/,
  "",
);

export const SESSION_COOKIE = "panel_session";
export const TENANT_COOKIE = "panel_tenant";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

type FetchOptions = {
  token?: string | null;
  /** Override del tenant activo (default: cookie `panel_tenant`). */
  tenant?: string | null;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
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
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 502, error: "No se pudo contactar el backend." };
  }

  if (res.status === 204) return { ok: true, data: undefined as T };

  const json = (await res.json().catch(() => null)) as
    | { error?: { message?: string } }
    | T
    | null;

  if (!res.ok) {
    const message =
      (json as { error?: { message?: string } } | null)?.error?.message ?? `Error ${res.status}`;
    return { ok: false, status: res.status, error: message };
  }
  return { ok: true, data: json as T };
}

export async function getSessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}
