import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: borrar (lógico) una nota del cliente. */
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string; noteId: string }> }) {
  const { id, noteId } = await ctx.params;
  const res = await apiFetch(`/admin/leads/${encodeURIComponent(id)}/notes/${encodeURIComponent(noteId)}`, {
    method: "DELETE",
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ ok: true });
}
