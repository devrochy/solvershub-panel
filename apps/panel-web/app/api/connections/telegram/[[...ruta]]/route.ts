import { NextResponse } from "next/server";

import { responder } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";
import { rutaTelegramDeBackend } from "@/lib/conexion-telegram";

/**
 * BFF de Telegram (ADR-0199, HU-CONN-27): reenvía al backend, con el token de la sesión y el negocio activo, solo las
 * rutas de la lista cerrada de `rutaTelegramDeBackend`. El cuerpo (con el token del bot) va tal cual y no se registra;
 * los errores salen aplanados (`{error, code, details}`) con su estado original, y el 409 `webhook_ajeno` trae
 * `details.webhook_url`.
 */
type Contexto = { params: Promise<{ ruta?: string[] }> };

async function reenviar(request: Request, ctx: Contexto) {
  const { ruta } = await ctx.params;
  const destino = rutaTelegramDeBackend(request.method, ruta ?? []);
  if (!destino) return NextResponse.json({ error: "Ruta no encontrada." }, { status: 404 });

  let body: unknown;
  if (request.method === "POST" || request.method === "PUT") {
    // Revisar y reparar no llevan cuerpo: un cuerpo vacío es `{}`.
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
    method: request.method as "GET" | "POST" | "PUT",
    ...(body === undefined ? {} : { body }),
  });
  return responder(res);
}

export { reenviar as GET, reenviar as POST, reenviar as PUT };
