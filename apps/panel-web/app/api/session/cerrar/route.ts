import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE, TENANT_COOKIE } from "@/lib/api/server";
import { publicUrl } from "@/lib/public-url";

/**
 * Cierra la sesión del navegador y lleva a /login. Lo usa el layout cuando la API ya no
 * acepta la sesión (negocio suspendido: 403 `tenant_suspended`; cuenta desactivada: 401):
 * un server component no puede borrar cookies, esta ruta sí.
 */
export async function GET(request: Request) {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(TENANT_COOKIE);
  return NextResponse.redirect(publicUrl(request, "/login"));
}
