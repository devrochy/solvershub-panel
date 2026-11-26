import { redirect } from "next/navigation";

/**
 * La lista de habilidades por negocio se retiró (HU-AOS-95, D-78): la habilidad es del negocio cuando algún agente
 * la tiene instalada, y se ve y se instala en cada agente. Los ajustes de cada habilidad siguen en
 * `/habilidades/{pack}`; Captar leads y el cobro de planes viven en Configuración.
 */
export default function HabilidadesPage() {
  redirect("/agentes");
}
