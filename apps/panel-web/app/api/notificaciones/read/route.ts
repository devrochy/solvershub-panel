import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: marcar leídas por ids, o todas (`{all: true}`). */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { ids?: string[]; all?: boolean } | null;
  if (!body || (!body.all && !body.ids?.length)) {
    return NextResponse.json({ error: "Indica qué notificaciones marcar." }, { status: 400 });
  }
  const res = await apiFetch<{ unread_count: number }>("/me/notifications/read", {
    method: "POST",
    body: body.all ? { all: true } : { ids: body.ids },
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}
