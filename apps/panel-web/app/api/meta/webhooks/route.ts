import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: registra la suscripción de APP de un canal. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { channel?: string } | null;
  if (!body?.channel) {
    return NextResponse.json({ error: "Falta el canal." }, { status: 400 });
  }
  const res = await apiFetch("/admin/meta/webhooks/register", {
    method: "POST",
    body: { channel: body.channel },
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
