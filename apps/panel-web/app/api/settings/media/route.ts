import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: guarda la configuración de audio o visión del negocio activo (SPEC-04). */
export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        action?: string;
        enabled?: boolean;
        provider?: string;
        model?: string;
        mode?: string;
        api_key?: string;
      }
    | null;
  const action = body?.action ?? "";

  if (action === "audio") {
    const res = await apiFetch("/admin/settings/media/audio", {
      method: "PUT",
      body: {
        enabled: body?.enabled ?? true,
        provider: body?.provider ?? "",
        model: body?.model ?? "",
        api_key: body?.api_key ?? "",
      },
    });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
    return NextResponse.json(res.data);
  }

  if (action === "vision") {
    const res = await apiFetch("/admin/settings/media/vision", {
      method: "PUT",
      body: {
        enabled: body?.enabled ?? true,
        mode: body?.mode ?? "describir",
        provider: body?.provider ?? "",
        model: body?.model ?? "",
        api_key: body?.api_key ?? "",
      },
    });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
    return NextResponse.json(res.data);
  }

  return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
}
