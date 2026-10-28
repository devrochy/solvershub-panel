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

/** BFF: guarda qué datos del cliente pide el agente, reenviando el Bearer y el negocio activo. */
export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as { politica?: unknown } | null;
  if (!body || !politicaValida(body.politica)) {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const res = await apiFetch("/admin/datos-cliente/politica", { method: "PUT", body: { politica: body.politica } });
  if (!res.ok) {
    return NextResponse.json(
      { error: res.error, ...(res.fields ? { fields: res.fields } : {}) },
      { status: res.status },
    );
  }
  return NextResponse.json(res.data);
}
