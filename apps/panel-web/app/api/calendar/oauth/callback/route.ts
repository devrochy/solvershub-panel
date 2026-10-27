import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { API_BASE, SESSION_COOKIE, TENANT_COOKIE } from "@/lib/api/server";
import { publicUrl } from "@/lib/public-url";

/** Cookies del flujo OAuth que deja la API en el start (anti-CSRF y destino). */
const OAUTH_COOKIES = ["oauth_state", "oauth_next", "oauth_conn"];

/**
 * BFF: retorno del OAuth de Google del pack Calendario (HU-CAL-07, ADR-0093).
 *
 * Google redirige acá (es la URI registrada en Google Cloud Console). Se reenvía a
 * la API con la sesión y el negocio del panel: la API valida el `state`, guarda los
 * tokens en la conexión del negocio y responde un 302 al panel, que se propaga junto
 * con las cookies que borra.
 */
export async function GET(request: Request) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value ?? null;
  const tenant = store.get(TENANT_COOKIE)?.value ?? null;
  if (!token) {
    // Sin sesión no se procesa el código: se vuelve a entrar y se reintenta.
    return NextResponse.redirect(publicUrl(request, "/login"));
  }

  const oauthCookies = OAUTH_COOKIES.flatMap((name) => {
    const value = store.get(name)?.value;
    return value ? [`${name}=${value}`] : [];
  }).join("; ");

  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/api/v1/pack/calendar/oauth/callback${new URL(request.url).search}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(tenant ? { "X-Tenant-Id": tenant } : {}),
          ...(oauthCookies ? { Cookie: oauthCookies } : {}),
        },
        redirect: "manual",
        cache: "no-store",
      },
    );
  } catch {
    return NextResponse.redirect(publicUrl(request, "/calendario?google=error"));
  }

  const location = res.headers.get("location");
  if (res.status >= 300 && res.status < 400 && location) {
    const salida = NextResponse.redirect(location);
    for (const cookie of res.headers.getSetCookie?.() ?? []) {
      salida.headers.append("set-cookie", cookie);
    }
    return salida;
  }
  return NextResponse.redirect(publicUrl(request, "/calendario?google=error"));
}
