import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";
import type { LeadNote } from "@/lib/api/types";

/** BFF: notas del equipo sobre el cliente (HU-CRM-04). */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await apiFetch<LeadNote[]>(`/admin/leads/${encodeURIComponent(id)}/notes`);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "Escribe la nota." }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: "Máximo 2000 caracteres." }, { status: 400 });
  const res = await apiFetch<LeadNote>(`/admin/leads/${encodeURIComponent(id)}/notes`, {
    method: "POST",
    body: { text },
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data, { status: 201 });
}
