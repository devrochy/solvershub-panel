import { NextResponse } from "next/server";

import { responder } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import { rutaTwilioDeBackend } from "@/lib/conexion-twilio";

/**
 * BFF de WhatsApp vía Twilio (ADR-0186, HU-CONN-11, HU-CONN-13 y las plantillas de HU-CONN-14): reenvía al backend, con el token de la sesión y
 * el negocio activo, solo las rutas de la lista cerrada de `rutaTwilioDeBackend`. El cuerpo (con el Auth Token) va
 * tal cual y no se registra; los errores salen aplanados (`{error, code, details}`) con su estado original, y el
 * 422 `webhook_overwrite_not_confirmed` trae `details.previous_webhook`.
 */
type Contexto = { params: Promise<{ ruta?: string[] }> };

async function reenviar(request: Request, ctx: Contexto) {
  const { ruta } = await ctx.params;
  const destino = rutaTwilioDeBackend(request.method, ruta ?? [], new URL(request.url).searchParams.get("dias"));
  if (!destino) return NextResponse.json({ error: "Ruta no encontrada." }, { status: 404 });

  let body: unknown;
  if (request.method === "POST" || request.method === "PUT" || request.method === "PATCH") {
    // Refrescar y re-registrar no llevan cuerpo: un cuerpo vacío es `{}`.
    const texto = await request.text();
    try {
      body = texto.trim() ? (JSON.parse(texto) as unknown) : {};
    } catch {
      body = null;
    }
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
    }
  }
  const res = await apiFetch<unknown>(destino, {
    method: request.method as "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    ...(body === undefined ? {} : { body }),
  });
  return responder(res);
}

export { reenviar as DELETE, reenviar as GET, reenviar as PATCH, reenviar as POST, reenviar as PUT };
