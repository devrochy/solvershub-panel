import { redirect } from "next/navigation";

/**
 * «Cobros al propietario» salió de Cobranza: esa facturación la maneja el agente de
 * suscripciones. Los enlaces viejos llegan a Pagos.
 */
export default function Page() {
  redirect("/cobranza/pagos");
}
