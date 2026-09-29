import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { API_BASE, SESSION_COOKIE, TENANT_COOKIE } from "@/lib/api/server";

/** BFF: arranca el OAuth de Google del pack Calendario (redirige a Google). */
export async function GET(request: Request) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value ?? null;
  const tenant = store.get(TENANT_COOKIE)?.value ?? null;
  const next = new URL(request.url).searchParams.get("next") ?? "/calendario";
  if (!token) {
    return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  }

  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/api/v1/pack/calendar/oauth/start?next=${encodeURIComponent(next)}`,
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
    return NextResponse.redirect(new URL(`${next}?google=error`, request.url));
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
  return NextResponse.redirect(new URL(`${next}?google=not_configured`, request.url));
}
