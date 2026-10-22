import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: ¿ya existe una cuenta con este correo? (alta en dos pasos, D-SPEC-34). */
export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email") ?? "";
  const res = await apiFetch<{ existe: boolean }>(`/admin/collaborators/existe?email=${encodeURIComponent(email)}`);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json(res.data);
}
