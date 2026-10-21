import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: invitaciones pendientes ENVIADAS por el negocio, para listarlas y revocarlas (HU-UI-14). */
export async function GET(request: Request) {
  const tenant = new URL(request.url).searchParams.get("tenant") ?? "";
  const query = tenant ? `?tenant=${encodeURIComponent(tenant)}` : "";
  const res = await apiFetch<{ id: string; email: string; rol: string; creadaEn: string | null }[]>(
    `/admin/invitations/outgoing${query}`,
  );
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json(res.data);
}
