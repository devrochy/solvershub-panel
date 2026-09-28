import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: roles de colaborador que aportan los packs habilitados (ADR-0066). */
export async function GET() {
  const res = await apiFetch("/admin/collaborators/pack-roles");
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json(res.data);
}
