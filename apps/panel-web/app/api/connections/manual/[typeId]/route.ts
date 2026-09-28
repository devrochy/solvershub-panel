import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: JSON Schema de credenciales de un tipo manual (+ valores si se edita). */
export async function GET(request: Request, ctx: { params: Promise<{ typeId: string }> }) {
  const { typeId } = await ctx.params;
  const connectionId = new URL(request.url).searchParams.get("connectionId");
  const query = connectionId ? `?connection_id=${encodeURIComponent(connectionId)}` : "";
  const res = await apiFetch(`/admin/connections/manual/${encodeURIComponent(typeId)}${query}`);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json(res.data);
}
