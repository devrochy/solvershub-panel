/**
 * BFF del centro de pruebas (SPEC-30): reenvía a `/api/v1/admin/qa/*` solo las rutas y los
 * métodos de esta lista. Pasa el cuerpo tal cual (JSON o multipart de las capturas) y
 * devuelve binarios (capturas, informe en Markdown) sin tocarlos. El token sale de la cookie
 * `httpOnly` y el negocio activo va como `X-Tenant-Id`, igual que `apiFetch`.
 */
import { cookies } from "next/headers";

import { API_BASE, SESSION_COOKIE, TENANT_COOKIE } from "@/lib/api/server";

type Metodo = "GET" | "POST" | "PUT" | "DELETE";

const SLUG = "[a-z0-9]+(?:-[a-z0-9]+)*";
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export const RUTAS_QA: { metodo: Metodo; patron: RegExp }[] = [
  { metodo: "GET", patron: /^catalog$/ },
  { metodo: "GET", patron: new RegExp(`^items/${SLUG}/history$`) },
  { metodo: "GET", patron: /^runs\/me$/ },
  { metodo: "POST", patron: /^runs\/me\/start$/ },
  { metodo: "PUT", patron: new RegExp(`^runs/me/items/${SLUG}/steps/\\d{1,3}$`) },
  { metodo: "PUT", patron: new RegExp(`^runs/me/items/${SLUG}$`) },
  { metodo: "POST", patron: /^runs\/me\/attachments$/ },
  { metodo: "POST", patron: /^runs\/me\/submit$/ },
  { metodo: "GET", patron: new RegExp(`^attachments/${UUID}$`) },
  { metodo: "DELETE", patron: new RegExp(`^attachments/${UUID}$`) },
  { metodo: "GET", patron: /^runs$/ },
  { metodo: "GET", patron: new RegExp(`^runs/${UUID}$`) },
  { metodo: "GET", patron: new RegExp(`^runs/${UUID}/report\\.md$`) },
  { metodo: "GET", patron: /^cycles$/ },
  { metodo: "POST", patron: /^cycles\/close$/ },
  { metodo: "PUT", patron: new RegExp(`^config/${SLUG}$`) },
  { metodo: "GET", patron: /^testers$/ },
  { metodo: "POST", patron: /^testers$/ },
  { metodo: "POST", patron: new RegExp(`^testers/${UUID}/revoke$`) },
];

export function rutaPermitida(metodo: string, ruta: string): boolean {
  return RUTAS_QA.some((r) => r.metodo === metodo && r.patron.test(ruta));
}

const CABECERAS_DE_VUELTA = ["content-type", "content-disposition", "cache-control", "x-content-type-options", "content-security-policy"];

export async function reenviarQa(request: Request, segmentos: string[]): Promise<Response> {
  const ruta = segmentos.join("/");
  const metodo = request.method.toUpperCase();
  if (!rutaPermitida(metodo, ruta)) {
    return Response.json({ error: "Ruta no disponible." }, { status: 404 });
  }
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return Response.json({ error: "Sesión requerida." }, { status: 401 });
  const tenant = store.get(TENANT_COOKIE)?.value;
  const query = new URL(request.url).search;

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (tenant) headers["X-Tenant-Id"] = tenant;
  const tipo = request.headers.get("content-type");
  if (tipo) headers["Content-Type"] = tipo;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/admin/qa/${ruta}${query}`, {
      method: metodo,
      headers,
      body: metodo === "GET" || metodo === "DELETE" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
    });
  } catch {
    return Response.json({ error: "No se pudo contactar el backend." }, { status: 502 });
  }

  const tipoDeVuelta = res.headers.get("content-type") ?? "";
  if (!res.ok && tipoDeVuelta.includes("application/json")) {
    // Mismo formato de error que el resto del BFF: `{error: "<mensaje>"}`.
    const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    return Response.json({ error: json?.error?.message ?? `Error ${res.status}` }, { status: res.status });
  }
  const salida = new Headers();
  for (const nombre of CABECERAS_DE_VUELTA) {
    const valor = res.headers.get(nombre);
    if (valor) salida.set(nombre, valor);
  }
  return new Response(res.status === 204 ? null : res.body, { status: res.status, headers: salida });
}
