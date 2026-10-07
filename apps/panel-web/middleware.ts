import { NextRequest, NextResponse } from "next/server";

import { ORIGIN_REJECTED_MESSAGE, origenPermitido, parseExtraOrigins } from "@/lib/origin-check";

// HU-ARCH-04: verificación de origen en el BFF para peticiones que cambian
// estado. Los clientes sin navegador (curl, webhooks, el backend) no envían
// `Origin` y pasan; el navegador siempre lo envía en POST/PUT/PATCH/DELETE
// cross-origin, así que un origen ajeno se rechaza aquí antes de tocar datos.
// El host esperado es el que vio el proxy (ver `lib/origin-check.ts`);
// ORIGINS_PERMITIDAS (CSV) suma orígenes extra, no reemplaza la regla.

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function middleware(request: NextRequest): NextResponse {
  if (!MUTATING.has(request.method)) {
    return NextResponse.next();
  }
  const extra = parseExtraOrigins(process.env.ORIGINS_PERMITIDAS);
  if (!origenPermitido(request.headers.get("origin"), request.headers, extra)) {
    // `error` es texto, como en todas las rutas del BFF: los formularios lo muestran tal cual.
    return NextResponse.json({ error: ORIGIN_REJECTED_MESSAGE }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
