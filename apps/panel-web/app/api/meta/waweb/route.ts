import { NextResponse } from "next/server";

import { responder } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";

/**
 * BFF: estado del vínculo WhatsApp Web (QR) y sus acciones. En error reenvía `code` y `details`: aceptar el
 * riesgo crea la conexión y puede responder el 409 del plan (`plan_limit_conexiones`, HU-BILL-19).
 */
export async function GET() {
  return responder(await apiFetch("/admin/meta/waweb"));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  const action = body?.action ?? "";
  const path = action === "accept-risk" ? "/admin/meta/waweb/accept-risk" : action === "reset" ? "/admin/meta/waweb/reset" : null;
  if (!path) {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }
  const res = await apiFetch(path, { method: "POST" });
  return responder(res, () => ({ ok: true }));
}
