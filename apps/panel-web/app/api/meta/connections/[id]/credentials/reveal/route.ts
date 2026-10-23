import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: revela los secretos propios del negocio en una conexión Meta. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const res = await apiFetch(`/admin/meta/connections/${encodeURIComponent(id)}/credentials/reveal`, {
    method: "POST",
    body: { password: body?.password ?? "" },
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}
