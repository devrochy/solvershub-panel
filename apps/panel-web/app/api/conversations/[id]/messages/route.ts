import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";
import type { MessagesSince } from "@/lib/api/types";

/** BFF: mensajes nuevos del hilo (`?after=`) para el polling de la bandeja (HU-UX-15). */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const after = new URL(request.url).searchParams.get("after");
  const qs = after ? `?after=${encodeURIComponent(after)}` : "";
  const res = await apiFetch<MessagesSince>(`/admin/conversations/${id}/messages${qs}`);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json(res.data);
}
