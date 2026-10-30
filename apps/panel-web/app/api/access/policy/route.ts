import { NextResponse } from "next/server";

import { respuestaDeAcceso } from "@/lib/api/access-respuesta";
import { apiFetch } from "@/lib/api/server";

const VALORES = new Set(["abierto", "restringido"]);
const ROLES = ["owner", "colaborador", "gestor"] as const;

/** BFF: política de dispositivos por rol (solo dueño o master en la API). */
export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  const payload: Record<string, unknown> = { confirmar: body.confirmar === true };
  for (const rol of ROLES) {
    const valor = body[rol];
    if (valor === undefined || valor === null) continue;
    if (typeof valor !== "string" || !VALORES.has(valor)) {
      return NextResponse.json({ error: "Valor de política inválido." }, { status: 400 });
    }
    payload[rol] = valor;
  }
  return respuestaDeAcceso(await apiFetch("/access/policy", { method: "PUT", body: payload }));
}
