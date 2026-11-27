import { reenviarPruebas, type Ids } from "../proxy";

/** La IA propone hasta 10 escenarios en borrador (cobra créditos de generación). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<Ids> },
) {
  return reenviarPruebas(await params, "/proponer", "POST");
}
