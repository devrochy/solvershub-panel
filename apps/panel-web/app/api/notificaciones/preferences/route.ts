import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";
import type { NotificacionPreferencias } from "@/lib/api/types";

/** BFF: preferencias de push por categoría y silencio vigente. */
export async function GET() {
  const res = await apiFetch<NotificacionPreferencias>("/me/notifications/preferences");
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as { push_off_categories?: string[] } | null;
  if (!body || !Array.isArray(body.push_off_categories)) {
    return NextResponse.json({ error: "Indica las categorías con el aviso apagado." }, { status: 400 });
  }
  const res = await apiFetch<NotificacionPreferencias>("/me/notifications/preferences", {
    method: "PUT",
    body: { push_off_categories: body.push_off_categories },
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}
