import { reenviarPruebas, type Ids } from "../proxy";

type Ctx = { params: Promise<Ids> };

/** Editar o aprobar un escenario (PATCH); borrarlo (DELETE, borrado lógico). */
export async function PATCH(request: Request, { params }: Ctx) {
  const ids = await params;
  return reenviarPruebas(ids, `/${ids.caseId}`, "PATCH", request);
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const ids = await params;
  return reenviarPruebas(ids, `/${ids.caseId}`, "DELETE");
}
