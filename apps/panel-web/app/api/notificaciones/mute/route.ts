import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";
import type { NotificacionPreferencias } from "@/lib/api/types";

/** BFF: silenciar el push `minutes` minutos (0 o ausente lo reactiva). */
export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as { minutes?: number | null } | null;
  const minutes = body?.minutes ?? null;
  if (minutes !== null && (!Number.isInteger(minutes) || minutes < 0)) {
    return NextResponse.json({ error: "Duración de silencio inválida." }, { status: 400 });
  }
  const res = await apiFetch<NotificacionPreferencias>("/me/notifications/mute", {
    method: "PUT",
    body: { minutes },
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}
