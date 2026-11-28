import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { API_BASE, SESSION_COOKIE, TENANT_COOKIE } from "@/lib/api/server";

/** BFF: importa leads desde un CSV (multipart) a la API del core. */
export async function POST(request: Request) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value ?? null;
  const tenant = store.get(TENANT_COOKIE)?.value ?? null;
  if (!token) {
    return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  if (!form || !(form.get("archivo") instanceof File)) {
    return NextResponse.json({ error: "Elige un archivo CSV." }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/admin/leads/import`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(tenant ? { "X-Tenant-Id": tenant } : {}),
      },
      body: form,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "No se pudo contactar el backend." }, { status: 502 });
  }
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    const error = json?.error as { message?: string } | string | undefined;
    return NextResponse.json(
      { error: typeof error === "string" ? error : (error?.message ?? "No se pudo importar el archivo.") },
      { status: res.status },
    );
  }
  return NextResponse.json(json ?? {}, { status: res.status });
}
