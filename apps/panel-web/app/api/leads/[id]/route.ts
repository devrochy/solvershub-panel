import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";
import type { LeadDetail } from "@/lib/api/types";

/** BFF: ficha del cliente (HU-UX-16). */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await apiFetch<LeadDetail>(`/admin/leads/${encodeURIComponent(id)}`);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}

/** BFF: corregir datos del perfil. Quedan como dato de una persona. */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { datos?: unknown } | null;
  const datos = body?.datos;
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }
  const res = await apiFetch<LeadDetail>(`/admin/leads/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: { datos },
  });
  if (!res.ok) return NextResponse.json({ error: res.error, fields: res.fields }, { status: res.status });
  return NextResponse.json(res.data);
}

/** BFF: pausar o reanudar el agente para este cliente. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  if (body?.action !== "toggle-bot") {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }
  const res = await apiFetch<{ bot_paused: boolean }>(`/admin/leads/${encodeURIComponent(id)}/toggle-bot`, {
    method: "POST",
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}
