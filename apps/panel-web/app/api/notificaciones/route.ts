import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";
import type { NotificacionPagina } from "@/lib/api/types";

const FILTROS = ["category", "unread", "cursor", "after", "limit"] as const;

/** BFF del centro de notificaciones (ADR-0167): la lista del usuario en el negocio activo. */
export async function GET(request: Request) {
  const entrada = new URL(request.url).searchParams;
  const qs = new URLSearchParams();
  for (const clave of FILTROS) {
    const valor = entrada.get(clave);
    if (valor) qs.set(clave, valor);
  }
  const res = await apiFetch<NotificacionPagina>(`/me/notifications${qs.size ? `?${qs}` : ""}`);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}
