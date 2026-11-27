import { reenviarPruebas, type Ids } from "../../proxy";

/** El informe de la corrida: avance, créditos, resumen y, por escenario, conversación, razón y arreglo. Se sondea. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<Ids> },
) {
  const ids = await params;
  return reenviarPruebas(ids, `/corridas/${ids.runId}`, "GET");
}
