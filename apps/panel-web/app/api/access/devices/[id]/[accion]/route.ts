import { NextResponse } from "next/server";

import { respuestaDeAcceso } from "@/lib/api/access-respuesta";
import { apiFetch } from "@/lib/api/server";

const ACCIONES = new Set(["aprobar", "bloquear", "dar-de-baja"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ESTADOS = new Set(["pendiente", "activo", "bloqueado"]);

/** BFF: aprobar/reactivar, bloquear y dar de baja un dispositivo (con el estado que se veía). */
export async function POST(request: Request, ctx: { params: Promise<{ id: string; accion: string }> }) {
  const { id, accion } = await ctx.params;
  if (!ACCIONES.has(accion) || !UUID.test(id)) {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.esperado !== "string" || !ESTADOS.has(body.esperado)) {
    return NextResponse.json({ error: "Falta el estado que se veía del equipo." }, { status: 400 });
  }
  const payload: Record<string, unknown> = { esperado: body.esperado };
  if (accion === "bloquear") {
    payload.alcance = body.alcance === "equipo" ? "equipo" : "cuenta";
    if (typeof body.motivo === "string" && body.motivo.trim()) payload.motivo = body.motivo.trim().slice(0, 300);
  }
  return respuestaDeAcceso(await apiFetch(`/access/devices/${id}/${accion}`, { method: "POST", body: payload }));
}
