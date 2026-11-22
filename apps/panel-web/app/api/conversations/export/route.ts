import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { API_BASE, SESSION_COOKIE, TENANT_COOKIE } from "@/lib/api/server";

/**
 * BFF: las conversaciones del negocio en CSV (HU-BILL-25), una fila por mensaje. Solo con `features.exportar`
 * (Premium y Empresarial); en otro plan la API responde 409 `plan_feature_not_included` y aquí se reenvía su
 * error tal cual. El cuerpo se transmite sin armarlo en memoria (la API lo manda por lotes) y se conserva
 * `X-Export-Truncated` si llegó al tope.
 */
export async function GET() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const tenant = store.get(TENANT_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Sin sesión." }, { status: 401 });

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/admin/conversations/export.csv`, {
      headers: { Authorization: `Bearer ${token}`, ...(tenant ? { "X-Tenant-Id": tenant } : {}) },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "No se pudo contactar el backend." }, { status: 502 });
  }
  if (!res.ok) {
    const cuerpo = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string; details?: unknown } } | null;
    const error = cuerpo?.error;
    return NextResponse.json(
      {
        error: error?.message ?? `Error ${res.status}`,
        ...(typeof error?.code === "string" ? { code: error.code } : {}),
        ...(error?.details && typeof error.details === "object" ? { details: error.details } : {}),
      },
      { status: res.status },
    );
  }
  const headers = new Headers({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="conversaciones-${new Date().toISOString().slice(0, 10)}.csv"`,
  });
  const recortado = res.headers.get("X-Export-Truncated");
  if (recortado) headers.set("X-Export-Truncated", recortado);
  return new NextResponse(res.body, { headers });
}
