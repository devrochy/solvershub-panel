import { NextResponse } from "next/server";

import { responder } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import { rutaDeBackend } from "@/lib/plantillas-opciones-ruta";

/**
 * BFF de plantillas con opciones (SPEC-40, HU-OPC-06): reenvía al backend, con el token de la sesión y el
 * negocio activo (`apiFetch`), solo las rutas de la lista cerrada de `rutaDeBackend`. El cuerpo lo valida
 * el backend; los errores salen aplanados (`{error, code, details}`) con su estado original, y en un 422/409
 * `details.hallazgos` trae los hallazgos de la definición.
 */
// Catch-all OPCIONAL (`[[...ruta]]`): sin segmentos es la lista (`GET`) y el alta (`POST`) de `/api/plantillas-opciones`;
// con `[...ruta]` esas dos rutas daban 404 y el panel nunca llegaba al backend.
type Contexto = { params: Promise<{ ruta?: string[] }> };

function leer(texto: string): unknown {
  try {
    return JSON.parse(texto) as unknown;
  } catch {
    return null;
  }
}

async function reenviar(request: Request, ctx: Contexto) {
  const { ruta } = await ctx.params;
  const destino = rutaDeBackend(request.method, ruta ?? []);
  if (!destino) return NextResponse.json({ error: "Ruta no encontrada." }, { status: 404 });

  let body: unknown;
  if (request.method === "POST" || request.method === "PUT") {
    // Publicar y retirar no llevan cuerpo: un cuerpo vacío es `{}`.
    const texto = await request.text();
    body = texto.trim() ? leer(texto) : {};
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
    }
  }
  const res = await apiFetch<unknown>(destino, {
    method: request.method as "GET" | "POST" | "PUT" | "DELETE",
    ...(body === undefined ? {} : { body }),
  });
  return responder(res);
}

export { reenviar as GET, reenviar as POST, reenviar as PUT, reenviar as DELETE };
