import { reenviarPruebas, type Ids } from "../../../../proxy";

/** Cuánto cuesta repetir solo las que fallaron, con cada k. No escribe nada. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<Ids> },
) {
  const ids = await params;
  return reenviarPruebas(
    ids,
    `/corridas/${ids.runId}/volver-a-probar/estimado`,
    "POST",
  );
}
