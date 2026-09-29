import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF del checklist de Meta: requisitos/producción y marcado de pasos. */
export async function GET(request: Request) {
  const kind = new URL(request.url).searchParams.get("kind") === "requirements" ? "requirements" : "production";
  const res = await apiFetch(`/admin/meta/checklist/${kind}`);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { action?: string; step_key?: string; done?: boolean; notes?: string }
    | null;
  if (body?.action === "run") {
    const run = await apiFetch("/admin/meta/checklist/production/run", { method: "POST" });
    if (!run.ok) return NextResponse.json({ error: run.error }, { status: run.status });
    return NextResponse.json(run.data);
  }
  const res = await apiFetch("/admin/meta/checklist/step", {
    method: "POST",
    body: { step_key: body?.step_key ?? "", done: Boolean(body?.done), notes: body?.notes ?? "" },
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ ok: true });
}
