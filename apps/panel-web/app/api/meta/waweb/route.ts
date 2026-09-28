import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: estado del vínculo WhatsApp Web (QR) y sus acciones. */
export async function GET() {
  const res = await apiFetch("/admin/meta/waweb");
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json(res.data);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  const action = body?.action ?? "";
  const path = action === "accept-risk" ? "/admin/meta/waweb/accept-risk" : action === "reset" ? "/admin/meta/waweb/reset" : null;
  if (!path) {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }
  const res = await apiFetch(path, { method: "POST" });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
