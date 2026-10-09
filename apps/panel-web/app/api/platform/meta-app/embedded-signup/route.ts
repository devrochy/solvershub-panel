import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF de los requisitos de Embedded Signup de la app de Meta de la plataforma (solo master, HU-SH-05). */
export async function GET() {
  const res = await apiFetch("/admin/platform/meta-app/embedded-signup");
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { key?: unknown; done?: unknown; notes?: unknown } | null;
  const res = await apiFetch("/admin/platform/meta-app/embedded-signup/step", {
    method: "POST",
    body: {
      key: typeof body?.key === "string" ? body.key : "",
      done: body?.done === true,
      notes: typeof body?.notes === "string" ? body.notes : null,
    },
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ ok: true });
}
