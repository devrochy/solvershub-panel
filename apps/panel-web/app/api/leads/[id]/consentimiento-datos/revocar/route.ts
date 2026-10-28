import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF (HU-CRM-16): retira los datos del cliente y registra que no autoriza guardarlos (dueño o master). */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await apiFetch(`/admin/leads/${encodeURIComponent(id)}/consentimiento-datos/revocar`, {
    method: "POST",
    body: {},
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}
