import { NextResponse } from "next/server";

import type { ApiResult } from "@/lib/api/server";

/**
 * Respuesta del BFF de Seguridad: conserva `code` y `details` del error de la API (el panel
 * distingue `estado_desactualizado` y las cuentas que se quedarían sin equipo al restringir).
 */
export function respuestaDeAcceso<T>(res: ApiResult<T>) {
  if (res.ok) {
    return res.status === 204 ? new NextResponse(null, { status: 204 }) : NextResponse.json(res.data);
  }
  return NextResponse.json(
    { error: res.error, code: res.code ?? null, details: res.details ?? null },
    { status: res.status },
  );
}
