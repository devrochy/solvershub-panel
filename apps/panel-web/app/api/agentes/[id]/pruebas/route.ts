import { reenviarPruebas, type Ids } from "./proxy";

type Ctx = { params: Promise<Ids> };

/** Escenarios del agente y su última corrida (GET); el dueño escribe uno (POST). */
export async function GET(_request: Request, { params }: Ctx) {
  return reenviarPruebas(await params, "", "GET");
}

export async function POST(request: Request, { params }: Ctx) {
  return reenviarPruebas(await params, "", "POST", request);
}
