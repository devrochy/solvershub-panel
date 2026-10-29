import { invalido, reenviarImportacion, UUID } from "@/app/api/agentes/importar-proxy";

type Ctx = { params: Promise<{ id: string }> };

/** Descarga la plantilla CSV del agente. */
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) return invalido();
  return reenviarImportacion(`/${id}/importar-datos/plantilla.csv`, { method: "GET" });
}
