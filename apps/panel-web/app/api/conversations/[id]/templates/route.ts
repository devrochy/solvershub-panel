import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";
import type { ApprovedTemplate } from "@/lib/api/types";

/** BFF: plantillas aprobadas de la conexión de esta conversación (HU-ARCH-13). */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await apiFetch<ApprovedTemplate[]>(`/admin/conversations/${id}/templates`);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json(res.data);
}
