import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

const ACTIONS = new Set(["message", "toggle-bot", "resolve", "template", "take", "return-to-bot", "note"]);

type Body = {
  action?: string;
  content?: string;
  template_id?: string;
  variables?: Record<string, string>;
  text?: string;
};

type Action = "message" | "template" | "toggle-bot" | "resolve" | "take" | "return-to-bot" | "note";

/** BFF: acciones sobre una conversación (mensaje humano, plantilla, bot, resolver, tomar,
 * devolver al agente y notas internas). */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as Body | null;
  const action = body?.action ?? "";
  if (!ACTIONS.has(action)) {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }

  const path = {
    message: `/admin/conversations/${id}/messages`,
    template: `/admin/conversations/${id}/template-messages`,
    "toggle-bot": `/admin/conversations/${id}/toggle-bot`,
    resolve: `/admin/conversations/${id}/resolve`,
    take: `/admin/conversations/${id}/take`,
    "return-to-bot": `/admin/conversations/${id}/return-to-bot`,
    note: `/admin/conversations/${id}/notes`,
  }[action as Action];

  const payload =
    action === "message"
      ? { content: body?.content ?? "" }
      : action === "template"
        ? { template_id: body?.template_id ?? "", variables: body?.variables ?? {} }
        : action === "note"
          ? { text: body?.text ?? "" }
          : undefined;

  const res = await apiFetch(path, { method: "POST", body: payload });
  if (!res.ok) {
    // HU-ARCH-13: un 409 al responder es la ventana de 24 h vencida; el panel ofrece
    // las plantillas aprobadas de la conexión.
    const code = action === "message" && res.status === 409 ? "window_expired" : undefined;
    return NextResponse.json({ error: res.error, code }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
