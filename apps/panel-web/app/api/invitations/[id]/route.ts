import { NextResponse } from "next/server";

import { fijarNegocioActivo } from "@/lib/api/negocio-activo";
import { apiFetch } from "@/lib/api/server";

const ACTIONS: Record<string, string> = {
  accept: "accept",
  reject: "reject",
  revoke: "revoke",
};

/**
 * BFF: resolver una invitación (aceptar/rechazar propias, revocar de dueño). Al aceptar con
 * `tenantId`, ese negocio queda activo (HU-SH-06): quien acepta entra directo a él.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { action?: string; tenantId?: string };
  const segment = ACTIONS[body.action ?? ""];
  if (!segment) {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }
  const res = await apiFetch(`/admin/invitations/${encodeURIComponent(id)}/${segment}`, { method: "POST" });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  if (segment === "accept" && typeof body.tenantId === "string" && body.tenantId) {
    // La API valida el acceso: si el negocio no es suyo, la cookie no cambia.
    await fijarNegocioActivo(body.tenantId);
  }
  return NextResponse.json({ ok: true });
}
