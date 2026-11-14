import { cuerpoDeImportacion, invalido, reenviarImportacion, UUID } from "@/app/api/agentes/importar-proxy";

type Ctx = { params: Promise<{ id: string }> };

/** Propone el mapeo de un CSV cualquiera y devuelve la precarga (SPEC-45, HU-COM-19). No escribe datos. */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) return invalido();
  const cuerpo = await cuerpoDeImportacion(request, false);
  if (!cuerpo) return invalido();
  return reenviarImportacion(`/${id}/importar-datos/mapear`, { method: "POST", body: cuerpo });
}
