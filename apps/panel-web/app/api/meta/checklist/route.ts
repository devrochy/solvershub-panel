import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/**
 * BFF de los requisitos de Meta y del marcado de pasos manuales. El checklist de producción
 * es por conexión (`/api/meta/connections/[id]/production`, HU-CONN-07).
 */
export async function GET() {
  const res = await apiFetch("/admin/meta/checklist/requirements");
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { step_key?: string; done?: boolean; notes?: string }
    | null;
  const res = await apiFetch("/admin/meta/checklist/step", {
    method: "POST",
    body: { step_key: body?.step_key ?? "", done: Boolean(body?.done), notes: body?.notes ?? "" },
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ ok: true });
}
