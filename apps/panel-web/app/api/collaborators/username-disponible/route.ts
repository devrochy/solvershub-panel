import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF: ¿el `username` está libre? (validación en tiempo real del alta, D-SPEC-34). */
export async function GET(request: Request) {
  const username = new URL(request.url).searchParams.get("username") ?? "";
  const res = await apiFetch<{ disponible: boolean }>(
    `/admin/collaborators/username-disponible?username=${encodeURIComponent(username)}`,
  );
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json(res.data);
}
