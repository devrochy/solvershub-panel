import { reenviarPruebas, type Ids } from "../../../proxy";

/** «Esto no es una falla»: el resultado sale del porcentaje y de volver a probar. */
export async function POST(
  request: Request,
  { params }: { params: Promise<Ids> },
) {
  const ids = await params;
  return reenviarPruebas(
    ids,
    `/resultados/${ids.resultId}/juez-equivocado`,
    "POST",
    request,
  );
}
