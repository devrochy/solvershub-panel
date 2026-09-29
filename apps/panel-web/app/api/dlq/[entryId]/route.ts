import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF de la DLQ: re-encola un evento fallido. */
export async function POST(_request: Request, ctx: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await ctx.params;
  const res = await apiFetch(`/admin/dlq/${encodeURIComponent(entryId)}/retry`, {
    method: "POST",
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
