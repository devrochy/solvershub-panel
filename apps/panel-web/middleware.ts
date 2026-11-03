import { NextRequest, NextResponse } from "next/server";

import { ORIGIN_REJECTED_MESSAGE, origenPermitido, parseExtraOrigins } from "@/lib/origin-check";
import { publicUrl } from "@/lib/public-url";
import { rutaDeLogin } from "@/lib/ruta-segura";

// Nombre de la cookie de sesión (`SESSION_COOKIE` de lib/api/server.ts, que importa `next/headers`
// y no se carga en el middleware).
const COOKIE_DE_SESION = "panel_session";

// HU-ARCH-04: verificación de origen en el BFF para peticiones que cambian
// estado. Los clientes sin navegador (curl, webhooks, el backend) no envían
// `Origin` y pasan; el navegador siempre lo envía en POST/PUT/PATCH/DELETE
// cross-origin, así que un origen ajeno se rechaza aquí antes de tocar datos.
// El host esperado es el que vio el proxy (ver `lib/origin-check.ts`);
// ORIGINS_PERMITIDAS (CSV) suma orígenes extra, no reemplaza la regla.

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function middleware(request: NextRequest): NextResponse {
  // La Wiki (/ayuda) es solo para quien tenga sesión: sin cookie se va al login y se vuelve a la
  // misma página al entrar. Es una comprobación rápida; si la cookie ya no vale, la página y el
  // layout lo detectan con `/admin/me` y también mandan al login. Qué páginas ve cada rol lo
  // decide la página (404 para las que su nivel no alcanza).
  const { pathname, search } = request.nextUrl;
  if (pathname === "/ayuda" || pathname.startsWith("/ayuda/")) {
    if (request.cookies.has(COOKIE_DE_SESION)) return NextResponse.next();
    return NextResponse.redirect(publicUrl(request, rutaDeLogin(pathname + search)));
  }
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
  matcher: ["/api/:path*", "/ayuda/:path*"],
};
