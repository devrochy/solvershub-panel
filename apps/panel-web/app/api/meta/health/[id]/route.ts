import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

const PATHS: Record<string, string> = {
  diagnose: "diagnose",
  resubscribe: "resubscribe",
  billing: "billing",
};

/** Acciones de token BYOK: van a `/admin/meta/byok/token/*` con el id de conexión. */
const TOKEN_PATHS: Record<string, string> = {
  inspect_token: "inspect",
  extend_token: "extend",
};

/** BFF: reparaciones y token de una conexión Meta. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as
    | { action?: string; manual_status?: string }
    | null;
  const action = body?.action ?? "";

  const tokenSegment = TOKEN_PATHS[action];
  if (tokenSegment) {
    const res = await apiFetch(`/admin/meta/byok/token/${tokenSegment}`, {
      method: "POST",
      body: { connection_id: id },
    });
    if (!res.ok) {
      return NextResponse.json({ error: res.error }, { status: res.status });
    }
    return NextResponse.json(res.data);
  }

  const segment = PATHS[action];
  if (!segment) {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }
  const res = await apiFetch(`/admin/meta/health/${id}/${segment}`, {
    method: "POST",
    body: action === "billing" ? { manual_status: body?.manual_status ?? "" } : undefined,
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
