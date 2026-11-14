import { invalido, reenviarImportacion, UUID } from "@/app/api/agentes/importar-proxy";

type Ctx = { params: Promise<{ id: string }> };

/** Cuántos créditos cuesta reconocer `fotos` fotos y si alcanza el crédito del mes (SPEC-45). */
export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  const fotos = Number(new URL(request.url).searchParams.get("fotos"));
  if (!UUID.test(id) || !Number.isInteger(fotos) || fotos < 1 || fotos > 100) return invalido();
  return reenviarImportacion(`/${id}/importar-datos/fotos/cotizacion?fotos=${fotos}`, { method: "GET" });
}
