import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

const NIVELES = new Set(["requerido", "recomendado", "no_pedir"]);

/** ¿Es `{ acción: { dato: nivel } }` con niveles conocidos? Lo demás lo valida el backend. */
function politicaValida(valor: unknown): valor is Record<string, Record<string, string>> {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) return false;
  return Object.values(valor).every(
    (ajustes) =>
      typeof ajustes === "object" &&
      ajustes !== null &&
      !Array.isArray(ajustes) &&
      Object.values(ajustes).every((nivel) => typeof nivel === "string" && NIVELES.has(nivel)),
  );
}

/** BFF: guarda qué datos del cliente pide el agente y/o si el agente puede consultarlos como herramienta,
 * reenviando el Bearer y el negocio activo. Cada parte es opcional; debe venir al menos una. */
export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    politica?: unknown;
    herramientas_del_agente?: unknown;
  } | null;
  const hayPolitica = body?.politica !== undefined;
  const hayHerramientas = body?.herramientas_del_agente !== undefined;
  if (
    !body ||
    (!hayPolitica && !hayHerramientas) ||
    (hayPolitica && !politicaValida(body.politica)) ||
    (hayHerramientas && typeof body.herramientas_del_agente !== "boolean")
  ) {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const res = await apiFetch("/admin/datos-cliente/politica", {
    method: "PUT",
    body: {
      ...(hayPolitica ? { politica: body.politica } : {}),
      ...(hayHerramientas ? { herramientas_del_agente: body.herramientas_del_agente } : {}),
    },
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: res.error, ...(res.fields ? { fields: res.fields } : {}) },
      { status: res.status },
    );
  }
  return NextResponse.json(res.data);
}
