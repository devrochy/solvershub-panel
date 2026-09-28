import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: inicia la suscripción a un plan y devuelve la URL del checkout. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { plan_id?: string } | null;
  if (!body?.plan_id) {
    return NextResponse.json({ error: "Falta el plan." }, { status: 400 });
  }
  const res = await apiFetch<{ checkout_url: string }>("/admin/plan/subscribe", {
    method: "POST",
    body: { plan_id: body.plan_id },
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json(res.data);
}
