import { invalido, reenviar, UUID } from "@/app/api/feedback/proxy";

type Ctx = { params: Promise<{ id: string }> };

/** Detalle de un reporte con las URLs firmadas de sus adjuntos (404 si es ajeno). */
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) return invalido();
  return reenviar(`/reports/${id}`, { method: "GET" });
}
