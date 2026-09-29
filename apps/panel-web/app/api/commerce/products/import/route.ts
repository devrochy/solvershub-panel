import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { API_BASE, SESSION_COOKIE, TENANT_COOKIE } from "@/lib/api/server";

/** BFF: importa productos desde un CSV (multipart) a la API del pack. */
export async function POST(request: Request) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value ?? null;
  const tenant = store.get(TENANT_COOKIE)?.value ?? null;
  if (!token) {
    return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Archivo requerido." }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/pack/commerce/products/import`, {
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
  const json = await res.json().catch(() => null);
  return NextResponse.json(json ?? {}, { status: res.status });
}
