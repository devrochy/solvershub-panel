import { NextResponse } from "next/server";

import { responder } from "@/app/api/agent-editor/respuesta";
import { apiFetch } from "@/lib/api/server";

/** BFF: alta/edición de una conexión manual. En error reenvía `code` y `details` (409 del plan, HU-BILL-19). */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.type_id) {
    return NextResponse.json({ error: "Falta el tipo de conexión." }, { status: 400 });
  }
  const res = await apiFetch("/admin/connections/manual", { method: "POST", body });
  return responder(res, () => ({ ok: true }));
}
