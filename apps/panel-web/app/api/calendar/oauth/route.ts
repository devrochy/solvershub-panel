import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { API_BASE, SESSION_COOKIE, TENANT_COOKIE } from "@/lib/api/server";
import { publicUrl } from "@/lib/public-url";

/** BFF: arranca el OAuth de Google del pack Calendario (redirige a Google). */
export async function GET(request: Request) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value ?? null;
  const tenant = store.get(TENANT_COOKIE)?.value ?? null;
  // Solo rutas relativas del panel: `//otro-dominio` sería una redirección abierta.
  const pedido = new URL(request.url).searchParams.get("next") ?? "";
  const next = pedido.startsWith("/") && !pedido.startsWith("//") ? pedido : "/calendario";
  // HU-CAL-08: reconectar una cuenta concreta (la API valida que sea del negocio).
  const conexion = new URL(request.url).searchParams.get("connection_id") ?? "";
  const extra = /^[0-9a-f-]{36}$/i.test(conexion) ? `&connection_id=${conexion}` : "";
  const conAviso = (codigo: string) => `${next}${next.includes("?") ? "&" : "?"}google=${codigo}`;
  if (!token) {
    return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  }

  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/api/v1/pack/calendar/oauth/start?next=${encodeURIComponent(next)}${extra}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(tenant ? { "X-Tenant-Id": tenant } : {}),
        },
        redirect: "manual",
        cache: "no-store",
      },
    );
  } catch {
    return NextResponse.redirect(publicUrl(request, conAviso("error")));
  }

  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location");
    if (location) {
      const salida = NextResponse.redirect(location);
      // La cookie del start (destino de vuelta) la emite la API: se reenvía.
      for (const cookie of res.headers.getSetCookie?.() ?? []) {
        salida.headers.append("set-cookie", cookie);
      }
      return salida;
    }
  }
  return NextResponse.redirect(publicUrl(request, conAviso("not_configured")));
}
