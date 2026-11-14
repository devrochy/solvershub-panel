import { cuerpoDeFoto, invalido, reenviarImportacion, UUID } from "@/app/api/agentes/importar-proxy";

type Ctx = { params: Promise<{ id: string }> };

/** Una foto → una fila propuesta (SPEC-45, HU-COM-20). La API cotiza, verifica el crédito y cobra una sola vez. */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) return invalido();
  const cuerpo = await cuerpoDeFoto(request);
  if (!cuerpo) return invalido();
  return reenviarImportacion(`/${id}/importar-datos/fotos`, { method: "POST", body: cuerpo });
}
