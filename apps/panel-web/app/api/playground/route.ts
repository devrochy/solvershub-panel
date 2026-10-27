import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/**
 * BFF del playground del asistente (historial, mensaje y reinicio). `connection_id` es opcional
 * (HU-AOS-57): prueba con la conexión de pruebas donde quedó el agente nuevo.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function conexion(valor: unknown): string | null {
  return typeof valor === "string" && UUID.test(valor) ? valor : null;
}

export async function GET(request: Request) {
  const id = conexion(new URL(request.url).searchParams.get("connection_id"));
  const res = await apiFetch(`/admin/playground${id ? `?connection_id=${id}` : ""}`);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json(res.data);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { action?: string; text?: string; connection_id?: string }
    | null;
  const id = conexion(body?.connection_id);
  const action = body?.action ?? "";
  if (action === "reset") {
    const res = await apiFetch(`/admin/playground/reset${id ? `?connection_id=${id}` : ""}`, { method: "POST" });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
    return NextResponse.json({ ok: true });
  }
  if (action !== "message") {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }
  const res = await apiFetch("/admin/playground/message", {
    method: "POST",
    body: { text: body?.text ?? "", ...(id ? { connection_id: id } : {}) },
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}
