import { cuerpoDePrecarga, invalido, reenviarImportacion, UUID } from "@/app/api/agentes/importar-proxy";

type Ctx = { params: Promise<{ id: string }> };

/** Importa la precarga editada (SPEC-45): la API la vuelve a validar y no duplica por clave. */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) return invalido();
  const cuerpo = await cuerpoDePrecarga(request);
  if (!cuerpo) return invalido();
  return reenviarImportacion(`/${id}/importar-datos/filas`, { method: "POST", body: cuerpo });
}
