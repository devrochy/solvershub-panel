/** Llamadas del navegador al BFF de pruebas (`/api/qa/*`). Errores en el texto que manda el BFF. */
export type Respuesta<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

export async function llamarQa<T>(
  ruta: string,
  init: { method?: "GET" | "POST" | "PUT" | "DELETE"; json?: unknown; form?: FormData } = {},
): Promise<Respuesta<T>> {
  try {
    const res = await fetch(`/api/qa/${ruta}`, {
      method: init.method ?? "GET",
      headers: init.json !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init.form ?? (init.json !== undefined ? JSON.stringify(init.json) : undefined),
    });
    if (res.status === 204) return { ok: true, data: undefined as T };
    const json = (await res.json().catch(() => null)) as (T & { error?: unknown }) | null;
    if (!res.ok) {
      const error = json && typeof json.error === "string" ? json.error : "No se pudo guardar. Inténtalo de nuevo.";
      return { ok: false, error, status: res.status };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: "Sin conexión con el servidor.", status: 0 };
  }
}

export const URL_ADJUNTO = (id: string) => `/api/qa/attachments/${id}`;
