import { reenviarPruebas, type Ids } from "../../../proxy";

/** Aplica el arreglo al borrador (nunca publica): `{confirmo: true, lock_version}`. */
export async function POST(
  request: Request,
  { params }: { params: Promise<Ids> },
) {
  const ids = await params;
  return reenviarPruebas(
    ids,
    `/resultados/${ids.resultId}/aplicar`,
    "POST",
    request,
  );
}
