import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: solicita el código, verifica o registra (con PIN) un número de Meta. */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string; phoneNumberId: string }> },
) {
  const { id, phoneNumberId } = await ctx.params;
  const body = (await request.json().catch(() => null)) as
    | { action?: string; code_method?: string; language?: string; code?: string; pin?: unknown }
    | null;
  const action = body?.action ?? "";
  if (action !== "request-code" && action !== "verify" && action !== "register") {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }
  const path = `/admin/meta/connections/${id}/numbers/${encodeURIComponent(phoneNumberId)}/${action}`;
  const payload =
    action === "request-code"
      ? { code_method: body?.code_method ?? "SMS", language: body?.language ?? "es" }
      : action === "verify"
        ? { code: body?.code ?? "" }
        : { pin: typeof body?.pin === "string" ? body.pin : null };
  const res = await apiFetch(path, { method: "POST", body: payload });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
