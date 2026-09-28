import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

const ACTIONS = new Set(["message", "toggle-bot", "resolve"]);

/** BFF: acciones sobre una conversación (mensaje humano, bot, resolver). */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as
    | { action?: string; content?: string }
    | null;
  const action = body?.action ?? "";
  if (!ACTIONS.has(action)) {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }

  const path =
    action === "message"
      ? `/admin/conversations/${id}/messages`
      : action === "toggle-bot"
        ? `/admin/conversations/${id}/toggle-bot`
        : `/admin/conversations/${id}/resolve`;

  const res = await apiFetch(path, {
    method: "POST",
    body: action === "message" ? { content: body?.content ?? "" } : undefined,
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
