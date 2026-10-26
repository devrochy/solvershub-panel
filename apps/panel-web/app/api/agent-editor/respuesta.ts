import { NextResponse } from "next/server";

import type { ApiResult } from "@/lib/api/server";

/** Validación de ids que viajan en la ruta del BFF (nunca se reenvía otra cosa al backend). */
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Respuesta del BFF del editor de agentes (HU-AOS-24): en error, el mensaje, el `code` estable y
 * los errores por campo de la API para mostrarlos junto a cada campo.
 */
export function responder<T>(res: ApiResult<T>, ok: (data: T) => unknown = (data) => data) {
  if (!res.ok) {
    return NextResponse.json(
      {
        error: res.error,
        ...(res.code ? { code: res.code } : {}),
        ...(res.fields ? { fields: res.fields } : {}),
        // HU-AOS-27: el 409 `gate_pendiente` trae el estado de la medición.
        ...(res.details ? { details: res.details } : {}),
      },
      { status: res.status },
    );
  }
  // 204 sin cuerpo (p. ej. iniciar o detener la prueba, HU-AOS-32): `Response.json` no lo admite.
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(ok(res.data), { status: res.status });
}

export function invalido(mensaje = "Solicitud inválida.") {
  return NextResponse.json({ error: mensaje }, { status: 400 });
}
