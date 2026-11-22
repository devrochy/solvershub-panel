import { NextResponse } from "next/server";

import { responder } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";

const TABS = new Set(["identity", "bajas", "whatsapp-web", "brain", "memory", "web-chat", "message-templates", "subscription-provider"]);

/** BFF: guarda una pestaña de Configuración reenviando el Bearer del panel. */
export async function PUT(request: Request, ctx: { params: Promise<{ tab: string }> }) {
  const { tab } = await ctx.params;
  if (!TABS.has(tab)) {
    return NextResponse.json({ error: "Pestaña inválida." }, { status: 404 });
  }
  const body = await request.json().catch(() => null);
  if (body == null) {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const res = await apiFetch(`/admin/settings/${tab}`, { method: "PUT", body });
  // En error: `fields` (422) para marcarlos junto a cada control y `code`/`details` para el 409 del plan
  // (el chat web o WhatsApp Web pueden ser una conexión que el plan no incluye, HU-BILL-19).
  return responder(res);
}
