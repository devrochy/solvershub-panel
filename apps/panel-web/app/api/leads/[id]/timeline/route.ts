import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";
import type { TimelineResponse } from "@/lib/api/types";

/** BFF: línea de tiempo del cliente, por páginas (`cursor` = `next_cursor` anterior). */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const cursor = new URL(request.url).searchParams.get("cursor");
  const qs = new URLSearchParams({ limit: "20" });
  if (cursor) qs.set("cursor", cursor);
  const res = await apiFetch<TimelineResponse>(`/admin/leads/${encodeURIComponent(id)}/timeline?${qs}`);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}
