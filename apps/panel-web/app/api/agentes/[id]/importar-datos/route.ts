import { invalido, reenviarImportacion, UUID } from "@/app/api/agentes/importar-proxy";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Estado de la importación del agente: su plantilla (columnas, topes, si va en producción y si importa fotos).
 * Lo leen el paso «Carga sus datos» al crear un agente y Ventas › Productos para elegir el agente que importa
 * (SPEC-45). La importación en sí va por `…/mapear`, `…/filas` y `…/fotos`.
 */
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) return invalido();
  return reenviarImportacion(`/${id}/importar-datos`, { method: "GET" });
}
