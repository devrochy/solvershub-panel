import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: acciones de Configuración avanzada (LLM, guardrails, versiones). */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { action?: string; record_id?: string; llm_provider?: string; llm_model?: string; llm_api_key?: string; guardrails_text?: string }
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

  if (action === "guardrails") {
    const res = await apiFetch("/admin/settings/advanced/guardrails", {
      method: "PUT",
      body: { guardrails_text: body?.guardrails_text ?? "" },
    });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
    return NextResponse.json(res.data);
  }

  if (action === "activate-version" && body?.record_id) {
    const res = await apiFetch(
      `/admin/settings/advanced/versions/${encodeURIComponent(body.record_id)}/activate`,
      { method: "POST" },
    );
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
    return NextResponse.json(res.data);
  }

  return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
}
