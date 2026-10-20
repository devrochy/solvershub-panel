import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";
import type { ConversationPage } from "@/lib/api/types";

const FILTROS = ["status", "q", "connection_id", "page"] as const;

/** BFF: lista de chats para el polling de la bandeja (HU-UX-15). */
export async function GET(request: Request) {
  const entrada = new URL(request.url).searchParams;
  const qs = new URLSearchParams();
  for (const clave of FILTROS) {
    const valor = entrada.get(clave);
    if (valor) qs.set(clave, valor);
  }
  const res = await apiFetch<ConversationPage>(`/admin/conversations${qs.size ? `?${qs}` : ""}`);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json(res.data);
}
