import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: contador de la campana (se consulta cada ~20 s con la pestaña visible). */
export async function GET() {
  const res = await apiFetch<{ unread_count: number }>("/me/notifications/unread-count");
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data);
}
