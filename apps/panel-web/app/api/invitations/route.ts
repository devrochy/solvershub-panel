import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: listado de mis invitaciones pendientes y alta de invitación. */
export async function GET() {
  const res = await apiFetch<{ items: unknown[]; total: number }>("/admin/invitations/pending");
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json(res.data);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const res = await apiFetch("/admin/invitations", { method: "POST", body });
  if (!res.ok) {
    return NextResponse.json({ error: res.error, code: res.code }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
