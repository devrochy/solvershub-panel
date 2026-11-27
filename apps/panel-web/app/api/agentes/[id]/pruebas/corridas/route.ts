import { reenviarPruebas, type Ids } from "../proxy";

/** Aprueba el estimado y deja la corrida en cola: `{case_ids, k, confirmo_creditos}`. */
export async function POST(
  request: Request,
  { params }: { params: Promise<Ids> },
) {
  return reenviarPruebas(await params, "/corridas", "POST", request);
}
