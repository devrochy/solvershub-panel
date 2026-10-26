import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: archivar una notificación (deja de listarse para este usuario). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await apiFetch<void>(`/me/notifications/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return new NextResponse(null, { status: 204 });
}
