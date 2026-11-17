import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/**
 * BFF del playground del asistente (historial, mensaje y reinicio). `connection_id` es opcional
 * (HU-AOS-57): prueba con la conexión de pruebas donde quedó el agente nuevo. `agent_id` (HU-AOS-72)
 * prueba el borrador de ese agente sin publicarlo; el backend lo prefiere sobre `connection_id`.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function conexion(valor: unknown): string | null {
  return typeof valor === "string" && UUID.test(valor) ? valor : null;
}

/** `?connection_id=…&agent_id=…` con solo los ids válidos. */
function consulta(ids: { connection_id: string | null; agent_id: string | null }): string {
  const q = new URLSearchParams();
  if (ids.connection_id) q.set("connection_id", ids.connection_id);
  if (ids.agent_id) q.set("agent_id", ids.agent_id);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const ids = { connection_id: conexion(params.get("connection_id")), agent_id: conexion(params.get("agent_id")) };
  const res = await apiFetch(`/admin/playground${consulta(ids)}`);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json(res.data);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { action?: string; text?: string; connection_id?: string; agent_id?: string }
    | null;
  const ids = { connection_id: conexion(body?.connection_id), agent_id: conexion(body?.agent_id) };
  const action = body?.action ?? "";
  if (action === "reset" || action === "close") {
    const ruta = action === "reset" ? "reset" : "close";
    const res = await apiFetch(`/admin/playground/${ruta}${consulta(ids)}`, { method: "POST" });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
    return NextResponse.json({ ok: true });
  }
  if (action !== "message") {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }
  const res = await apiFetch("/admin/playground/message", {
    method: "POST",
    body: {
      text: body?.text ?? "",
      ...(ids.connection_id ? { connection_id: ids.connection_id } : {}),
      ...(ids.agent_id ? { agent_id: ids.agent_id } : {}),
    },
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}
