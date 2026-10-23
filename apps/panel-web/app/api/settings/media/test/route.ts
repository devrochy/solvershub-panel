import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: prueba la conexión de un proveedor de audio o visión sin guardar la config. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { kind?: string; provider?: string; model?: string; api_key?: string }
    | null;
  const kind = body?.kind ?? "";
  if (kind !== "audio" && kind !== "vision") {
    return NextResponse.json({ error: "Tipo de proveedor inválido." }, { status: 400 });
  }

  const res = await apiFetch(`/admin/settings/media/${kind}/test`, {
    method: "POST",
    body: {
      provider: body?.provider ?? "",
      model: body?.model ?? "",
      api_key: body?.api_key ?? "",
    },
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}
