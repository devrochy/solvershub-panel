import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: LLM propio (BYOK) de Configuración avanzada. Spec, guardrails y versiones se retiraron con el v2 (HU-AOS-91). */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { action?: string; llm_provider?: string; llm_model?: string; llm_api_key?: string }
    | null;
  const action = body?.action ?? "";

  if (action === "llm") {
    const res = await apiFetch("/admin/settings/advanced/llm", {
      method: "PUT",
      body: {
        llm_provider: body?.llm_provider ?? "",
        llm_model: body?.llm_model ?? "",
        llm_api_key: body?.llm_api_key ?? "",
      },
    });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
    return NextResponse.json(res.data);
  }

  return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
}
