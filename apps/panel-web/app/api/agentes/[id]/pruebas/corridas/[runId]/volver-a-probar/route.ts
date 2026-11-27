import { reenviarPruebas, type Ids } from "../../../proxy";

/** Nueva corrida solo con los escenarios que fallaron: `{k, confirmo_creditos}`. */
export async function POST(
  request: Request,
  { params }: { params: Promise<Ids> },
) {
  const ids = await params;
  return reenviarPruebas(
    ids,
    `/corridas/${ids.runId}/volver-a-probar`,
    "POST",
    request,
  );
}
