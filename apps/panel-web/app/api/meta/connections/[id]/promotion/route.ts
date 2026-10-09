import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF de "Pasar a producción" de una conexión BYOK (HU-CONN-06): estado, número real,
 * verificar y terminar. El access token viaja solo hacia la API, nunca vuelve. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await apiFetch(`/admin/meta/connections/${encodeURIComponent(id)}/promotion`);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as
    | { action?: string; waba_id?: unknown; phone_number_id?: unknown; access_token?: unknown }
    | null;
  const action = body?.action ?? "";
  if (action !== "number" && action !== "verify" && action !== "finish") {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }
  const texto = (v: unknown) => (typeof v === "string" ? v : "");
  const payload =
    action === "number"
      ? {
          waba_id: texto(body?.waba_id),
          phone_number_id: texto(body?.phone_number_id),
          access_token: texto(body?.access_token) || null,
        }
      : undefined;
  const res = await apiFetch(`/admin/meta/connections/${encodeURIComponent(id)}/promotion/${action}`, {
    method: "POST",
    ...(payload ? { body: payload } : {}),
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data ?? { ok: true });
}
