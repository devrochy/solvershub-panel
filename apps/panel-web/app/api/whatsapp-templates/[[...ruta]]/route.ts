import { NextResponse } from "next/server";

import { responder } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import { rutaPlantillasNegocioDeBackend } from "@/lib/plantillas-negocio";

/**
 * BFF de las plantillas del negocio en todas sus conexiones de WhatsApp (HU-CONN-21): reenvía al backend, con el
 * token de la sesión y el negocio activo, solo la lectura de la matriz y las dos copias.
 */
type Contexto = { params: Promise<{ ruta?: string[] }> };

async function reenviar(request: Request, ctx: Contexto) {
  const { ruta } = await ctx.params;
  const destino = rutaPlantillasNegocioDeBackend(request.method, ruta ?? []);
  if (!destino) return NextResponse.json({ error: "Ruta no encontrada." }, { status: 404 });
  if (request.method === "GET") return responder(await apiFetch<unknown>(destino));

  let body: unknown;
  try {
    body = JSON.parse(await request.text()) as unknown;
  } catch {
    body = null;
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  return responder(await apiFetch<unknown>(destino, { method: "POST", body }));
}

export { reenviar as GET, reenviar as POST };
