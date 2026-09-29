import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

const ACTIONS: Record<string, string> = {
  accept: "accept",
  reject: "reject",
  revoke: "revoke",
};

/** BFF: resolver una invitación (aceptar/rechazar propias, revocar de dueño). */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  const segment = ACTIONS[body.action ?? ""];
  if (!segment) {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }
  const res = await apiFetch(`/admin/invitations/${id}/${segment}`, { method: "POST" });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
