import { reenviarPruebas, type Ids } from "../../../proxy";

/** El arreglo de un resultado con su diff contra el borrador de ahora. No escribe nada. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<Ids> },
) {
  const ids = await params;
  return reenviarPruebas(ids, `/resultados/${ids.resultId}/arreglo`, "GET");
}
