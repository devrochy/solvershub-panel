import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: dispara la sincronización manual de precios de Meta. */
export async function POST() {
  const res = await apiFetch<{ errors: string[] }>("/admin/costs/meta/sync", {
    method: "POST",
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json(res.data);
}
