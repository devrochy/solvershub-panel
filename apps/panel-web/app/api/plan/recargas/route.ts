import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/**
 * BFF: compra un paquete de recarga de créditos (HU-BILL-23) y devuelve la URL del checkout. Reenvía
 * el `code` del error para que el cajón distinga `recarga_bajo_minimo` (su mensaje va tal cual).
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { paquete?: unknown } | null;
  if (typeof body?.paquete !== "string" || !body.paquete) {
    return NextResponse.json({ error: "Falta el paquete." }, { status: 400 });
  }
  const res = await apiFetch<{ checkout_url: string }>("/admin/plan/recargas", {
    method: "POST",
    body: { paquete: body.paquete },
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.error, ...(res.code ? { code: res.code } : {}) }, { status: res.status });
  }
  return NextResponse.json(res.data);
}
