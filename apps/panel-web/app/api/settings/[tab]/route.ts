import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

const TABS = new Set(["identity", "bajas", "brain", "memory", "skills", "web-chat", "message-templates", "subscription-provider"]);

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
  if (!res.ok) {
    // `fields`: errores por campo (422) para marcarlos junto a cada control.
    return NextResponse.json(
      { error: res.error, ...(res.fields ? { fields: res.fields } : {}) },
      { status: res.status },
    );
  }
  return NextResponse.json(res.data);
}
