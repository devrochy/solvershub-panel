import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { API_BASE, SESSION_COOKIE, TENANT_COOKIE } from "@/lib/api/server";
import { consultaClientes } from "@/lib/clientes";

/** BFF: la lista de clientes filtrada en CSV (la arma la API, hasta 5000 filas). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const qs = consultaClientes(
    {
      q: url.searchParams.get("q") ?? undefined,
      channel: url.searchParams.get("channel") ?? undefined,
      connection_id: url.searchParams.get("connection_id") ?? undefined,
      filtro: url.searchParams.getAll("filtro"),
    },
    { conPagina: false },
  );
  // Lista de un módulo (Ventas, Agenda): solo los clientes con datos de ese agente.
  const agente = url.searchParams.get("agente");
  if (agente) qs.set("agente", agente);
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const tenant = store.get(TENANT_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Sin sesión." }, { status: 401 });

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/admin/leads/export.csv${qs.size ? `?${qs}` : ""}`, {
      headers: { Authorization: `Bearer ${token}`, ...(tenant ? { "X-Tenant-Id": tenant } : {}) },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "No se pudo contactar el backend." }, { status: 502 });
  }
  if (!res.ok) return NextResponse.json({ error: `Error ${res.status}` }, { status: res.status });
  return new NextResponse(await res.text(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clientes-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
