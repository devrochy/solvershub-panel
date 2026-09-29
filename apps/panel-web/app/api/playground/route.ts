import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF del playground del asistente (historial, mensaje y reinicio). */
export async function GET() {
  const res = await apiFetch("/admin/playground");
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json(res.data);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { action?: string; text?: string }
    | null;
  const action = body?.action ?? "";
  if (action === "reset") {
    const res = await apiFetch("/admin/playground/reset", { method: "POST" });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
    return NextResponse.json({ ok: true });
  }
  if (action !== "message") {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }
  const res = await apiFetch("/admin/playground/message", {
    method: "POST",
    body: { text: body?.text ?? "" },
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}
