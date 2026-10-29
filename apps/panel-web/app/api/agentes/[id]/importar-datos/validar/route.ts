import { cuerpoDeImportacion, invalido, reenviarImportacion, UUID } from "@/app/api/agentes/importar-proxy";

type Ctx = { params: Promise<{ id: string }> };

/** Vista previa del archivo: errores por fila y cuántas filas se crearían. No escribe nada. */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) return invalido();
  const cuerpo = await cuerpoDeImportacion(request, false);
  if (!cuerpo) return invalido();
  return reenviarImportacion(`/${id}/importar-datos/validar`, { method: "POST", body: cuerpo });
}
