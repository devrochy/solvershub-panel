import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

const PATHS: Record<string, string> = {
  plan: "plan",
  activate: "activate",
  deactivate: "deactivate",
  purge: "purge",
};

/** BFF: ciclo de vida y plan de un negocio (master). */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as
    | ({ action?: string } & Record<string, unknown>)
    | null;
  const action = body?.action ?? "";
  const segment = PATHS[action];
  if (!segment) {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }

  const payload = { ...(body ?? {}) };
  delete payload.action;

  const res = await apiFetch(`/admin/platform/tenants/${id}/${segment}`, {
    method: "POST",
    body: payload,
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
