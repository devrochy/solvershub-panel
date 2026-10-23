import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/**
 * BFF de la prueba de humo de una cuenta de Instagram (HU-CHAN-04): `POST` empieza (la API da el momento del servidor
 * desde el que se espera el mensaje) y `GET ?since=` consulta si llegó. El ID de la cuenta y `since` se validan antes
 * de llegar a la API: nada que no sea dígitos o una fecha ISO viaja en la ruta.
 */
const ID_DE_CUENTA = /^[0-9]{1,32}$/;
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}T[0-9:.]+(Z|[+-]\d{2}:\d{2})$/;

type Contexto = { params: Promise<{ igUserId: string }> };

export async function POST(_request: Request, { params }: Contexto) {
  const { igUserId } = await params;
  if (!ID_DE_CUENTA.test(igUserId)) return NextResponse.json({ error: "Cuenta inválida." }, { status: 400 });
  const res = await apiFetch(`/admin/meta/instagram/accounts/${igUserId}/diagnostic`, { method: "POST" });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}

export async function GET(request: Request, { params }: Contexto) {
  const { igUserId } = await params;
  const since = new URL(request.url).searchParams.get("since") ?? "";
  if (!ID_DE_CUENTA.test(igUserId)) return NextResponse.json({ error: "Cuenta inválida." }, { status: 400 });
  if (!FECHA_ISO.test(since)) return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  const res = await apiFetch(
    `/admin/meta/instagram/accounts/${igUserId}/diagnostic?since=${encodeURIComponent(since)}`,
  );
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}
