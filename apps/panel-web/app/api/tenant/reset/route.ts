import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { TENANT_COOKIE } from "@/lib/api/server";
import { publicUrl } from "@/lib/public-url";

/**
 * Olvida el negocio activo guardado en la cookie y vuelve al Resumen. Lo usa el layout
 * cuando la API ya no acepta ese negocio (la cuenta se desvinculó o el negocio se
 * suspendió): sin esto, cada carga volvía a mandar el negocio viejo y la sesión quedaba
 * en un bucle hacia /login. Un server component no puede borrar cookies; esta ruta sí.
 */
export async function GET(request: Request) {
  (await cookies()).delete(TENANT_COOKIE);
  return NextResponse.redirect(publicUrl(request, "/dashboard"));
}
