import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";
import type { SearchResponse } from "@/lib/api/types";

/**
 * BFF: búsqueda global de la paleta de comandos (HU-DS-05) sobre `GET /api/v1/search`
 * (ADR-0096, el mismo endpoint de la app). El backend filtra por permisos de cada sección
 * y por el negocio activo (`X-Tenant-Id` desde la cookie `panel_tenant`).
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 100) {
    return NextResponse.json({ error: "Escribe entre 2 y 100 caracteres." }, { status: 400 });
  }
  const res = await apiFetch<SearchResponse>(`/search?q=${encodeURIComponent(q)}&limit=5`);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({ resultados: res.data.resultados.filter((s) => s.items.length > 0) });
}
