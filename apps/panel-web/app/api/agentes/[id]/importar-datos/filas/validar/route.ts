import { cuerpoDePrecarga, invalido, reenviarImportacion, UUID } from "@/app/api/agentes/importar-proxy";

type Ctx = { params: Promise<{ id: string }> };

/** Vista previa de la precarga editada (SPEC-45): errores por fila, sin escribir nada. */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) return invalido();
  const cuerpo = await cuerpoDePrecarga(request);
  if (!cuerpo) return invalido();
  return reenviarImportacion(`/${id}/importar-datos/filas/validar`, { method: "POST", body: cuerpo });
}
