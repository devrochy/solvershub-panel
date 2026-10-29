import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { API_BASE, SESSION_COOKIE, TENANT_COOKIE } from "@/lib/api/server";
import { mensajeDeValidacion } from "@/lib/api/validacion";

/** Ids que viajan en la ruta del BFF: nunca se reenvía otra cosa al backend. */
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * BFF de «Importar datos» (HU-QA-12): reenvía a `/api/v1/admin/agents/{id}/importar-datos…` con la sesión y el
 * negocio de las cookies. Acepta multipart (el archivo) y devuelve el CSV tal cual para la plantilla. En error
 * conserva `{error, code}` de la API para que el panel distinga un archivo con errores de uno muy grande.
 */
export async function reenviarImportacion(
  ruta: string,
  init: { method: "GET" | "POST" | "DELETE"; body?: FormData },
): Promise<Response> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value ?? null;
  const tenant = store.get(TENANT_COOKIE)?.value ?? null;
  if (!token) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/admin/agents${ruta}`, {
      method: init.method,
      headers: { Authorization: `Bearer ${token}`, ...(tenant ? { "X-Tenant-Id": tenant } : {}) },
      body: init.body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "No se pudo contactar el backend." }, { status: 502 });
  }
  if (res.ok && (res.headers.get("content-type") ?? "").startsWith("text/csv")) {
    return new NextResponse(await res.arrayBuffer(), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": res.headers.get("content-disposition") ?? 'attachment; filename="plantilla.csv"',
        "Cache-Control": "no-store",
      },
    });
  }
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
    { error: mensaje, ...(typeof error.code === "string" ? { code: error.code } : {}) },
    { status: res.status },
  );
}

export function invalido() {
  return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
}

/** Del formulario recibido, solo el archivo (y `solo_validas` si se pide): nada más llega a la API. */
export async function cuerpoDeImportacion(request: Request, conSoloValidas: boolean): Promise<FormData | null> {
  const recibido = await request.formData().catch(() => null);
  const archivo = recibido?.get("archivo");
  if (!recibido || !(archivo instanceof Blob)) return null;
  const form = new FormData();
  form.set("archivo", archivo, archivo instanceof File ? archivo.name : "datos.csv");
  if (conSoloValidas && recibido.get("solo_validas") === "true") form.set("solo_validas", "true");
  return form;
}
