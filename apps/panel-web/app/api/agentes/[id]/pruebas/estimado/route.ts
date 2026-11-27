import { reenviarPruebas, type Ids } from "../proxy";

/** Costo de correr los escenarios con cada k y cuánto sale de la cuota gratis. No escribe nada. */
export async function POST(
  request: Request,
  { params }: { params: Promise<Ids> },
) {
  return reenviarPruebas(await params, "/estimado", "POST", request);
}
