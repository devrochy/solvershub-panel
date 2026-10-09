import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF del mensaje de prueba del hub de una conexión de WhatsApp (HU-SH-05). */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as
    | { to?: unknown; template_name?: unknown; language?: unknown }
    | null;
  const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const res = await apiFetch(`/admin/meta/connections/${encodeURIComponent(id)}/test-message`, {
    method: "POST",
    body: { to: texto(body?.to) ?? "", template_name: texto(body?.template_name), language: texto(body?.language) },
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}
