import { NextRequest, NextResponse } from "next/server";

// HU-ARCH-04: verificación de origen en el BFF para peticiones que cambian
// estado. Los clientes sin navegador (curl, webhooks, el backend) no envían
// `Origin` y pasan; el navegador siempre lo envía en POST/PUT/PATCH/DELETE
// cross-origin, así que un origen ajeno se rechaza aquí antes de tocar datos.
// En producción se puede ampliar la lista con ORIGINS_PERMITIDAS (CSV).

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function middleware(request: NextRequest): NextResponse {
  if (!MUTATING.has(request.method)) {
    return NextResponse.next();
  }
  const origin = request.headers.get("origin");
  if (!origin) {
    return NextResponse.next();
  }
  const extra = (process.env.ORIGINS_PERMITIDAS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const permitidos = extra.length > 0 ? extra : [request.nextUrl.origin];
  if (!permitidos.includes(origin)) {
    return NextResponse.json(
      { error: { code: "origen_no_permitido", message: "Origen no permitido." } },
      { status: 403 }
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
