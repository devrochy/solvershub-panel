import { reenviarPruebas, type Ids } from "../../../proxy";

/** Cancela una corrida en cola o en curso; se cobra solo lo gastado. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<Ids> },
) {
  const ids = await params;
  return reenviarPruebas(ids, `/corridas/${ids.runId}/cancelar`, "POST");
}
