import { mensajeDeError } from "@/lib/pruebas-del-agente";

export type Respuesta<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: number;
      error: string;
      code?: string;
      details?: Record<string, unknown>;
    };

/** Una llamada al BFF de pruebas: el cuerpo ya sale en palabras del dueño (`mensajeDeError`) y con el `code` a mano. */
export async function llamar<T>(
  url: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  body?: unknown,
): Promise<Respuesta<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      ...(body === undefined
        ? {}
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
    });
  } catch {
    return { ok: false, status: 0, error: "No se pudo contactar el servidor." };
  }
  if (res.ok) {
    if (res.status === 204) return { ok: true, data: undefined as T };
    return { ok: true, data: (await res.json().catch(() => null)) as T };
  }
  const json = (await res.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
    details?: Record<string, unknown>;
  };
  return {
    ok: false,
    status: res.status,
    error: mensajeDeError(json, "No se pudo completar. Inténtalo de nuevo."),
    ...(json.code ? { code: json.code } : {}),
    ...(json.details ? { details: json.details } : {}),
  };
}

export const rutaDePruebas = (agenteId: string, resto = "") =>
  `/api/agentes/${agenteId}/pruebas${resto}`;
