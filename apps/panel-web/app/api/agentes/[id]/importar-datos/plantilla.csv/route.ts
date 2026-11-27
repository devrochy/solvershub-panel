import { invalido, reenviarImportacion, UUID } from "@/app/api/agentes/importar-proxy";

type Ctx = { params: Promise<{ id: string }> };

/**
 * La plantilla CSV del agente para descargar (HU-UX-30, «Opciones avanzadas» de la estación 4): las cabeceras que
 * espera su importador y filas de ejemplo, en UTF-8 con BOM para Excel. El proxy la devuelve tal cual.
 */
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) return invalido();
  return reenviarImportacion(`/${id}/importar-datos/plantilla.csv`, { method: "GET" });
}
