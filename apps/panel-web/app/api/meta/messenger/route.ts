import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/**
 * BFF del alta de Messenger (HU-CHAN-01, ADR-0152): estado, intento del popup, descubrimiento
 * de Páginas y conexión. El `code` del popup y el intento viajan solo hacia la API y no se
 * guardan aquí; los tokens de las Páginas nunca llegan al navegador. Cada acción reenvía solo
 * sus campos.
 */
export async function GET() {
  const res = await apiFetch("/admin/meta/messenger");
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}

const RUTAS: Record<string, { path: string; campos: string[] }> = {
  attempt: { path: "/admin/meta/messenger/attempt", campos: [] },
  discover: { path: "/admin/meta/messenger/discover", campos: ["code", "attempt"] },
  connect: { path: "/admin/meta/messenger/connect", campos: ["connection_id", "page_ids"] },
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const destino = RUTAS[String(body?.action ?? "")];
  if (!destino) return NextResponse.json({ error: "Acción inválida." }, { status: 400 });

  const payload: Record<string, unknown> = {};
  for (const campo of destino.campos) {
    const valor = body?.[campo];
    if (valor !== undefined && valor !== null) payload[campo] = valor;
  }
  const res = await apiFetch(destino.path, { method: "POST", body: destino.campos.length ? payload : undefined });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data ?? { ok: true });
}
