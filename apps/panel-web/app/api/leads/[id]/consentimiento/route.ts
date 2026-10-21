import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";
import type { Consentimiento } from "@/lib/api/types";

/** BFF (HU-CRM-06): consentimiento del cliente para recibir promociones. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await apiFetch<Consentimiento>(`/admin/leads/${encodeURIComponent(id)}/consentimiento`);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}

const COMO = new Set(["en_el_local", "por_telefono", "por_escrito", "otro"]);

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const estado = body?.estado;
  const como = body?.como;
  const evidencia = typeof body?.evidencia === "string" ? body.evidencia.trim().slice(0, 400) : "";
  if ((estado !== "otorgado" && estado !== "revocado") || typeof como !== "string" || !COMO.has(como)) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }
  const res = await apiFetch<Consentimiento>(`/admin/leads/${encodeURIComponent(id)}/consentimiento`, {
    method: "POST",
    body: { estado, como, evidencia },
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data, { status: 201 });
}
