import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: checklist de la app de Meta de la plataforma (solo master, HU-CONN-07). */
export async function GET() {
  const res = await apiFetch("/admin/platform/meta-app");
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}

export async function POST() {
  const res = await apiFetch("/admin/platform/meta-app/run", { method: "POST" });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data, { status: 202 });
}
