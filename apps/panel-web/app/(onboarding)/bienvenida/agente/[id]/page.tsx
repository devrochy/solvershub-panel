import { notFound, redirect } from "next/navigation";

import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { apiFetch } from "@/lib/api/server";
import type { Me, PrimerosPasos } from "@/lib/api/types";
import { cargarEditorDeAgente } from "@/lib/editor-de-agente-datos";
import { pasoDelEditorEnLaBienvenida } from "@/lib/onboarding";

import { BienvenidaDelAgente } from "../../_components/bienvenida-del-agente";

export const metadata = { title: "Primeros pasos" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Estaciones 2 a 5 de la bienvenida (HU-UX-25): el agente que creó el recorrido, con el editor a pantalla completa.
 * Las mismas reglas de entrada que `/bienvenida`; un agente que no es el del recorrido vuelve a empezar allí.
 */
export default async function BienvenidaDelAgentePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [me, onboarding] = await Promise.all([apiFetch<Me>("/admin/me"), apiFetch<PrimerosPasos>("/admin/onboarding")]);
  if (!me.ok) redirect(me.status === 401 ? "/api/session/cerrar" : "/login");
  if (!onboarding.ok || !me.data.tenant) redirect("/dashboard");
  const recorrido = onboarding.data.recorrido;
  const puede = me.data.tenant.role === "owner" || me.data.role === "master";
  if (!recorrido.aplica || recorrido.estado === "completo" || !puede) redirect("/dashboard");
  if (recorrido.agente_id !== id) redirect("/bienvenida");

  const carga = await cargarEditorDeAgente(id);
  if (carga.estado === "no_existe" || carga.estado === "no_especialista") redirect("/bienvenida");
  if (carga.estado === "error") {
    return (
      <main id="contenido" className="mx-auto w-full max-w-xl px-4 py-12">
        <ErrorDeCarga titulo="No pudimos abrir tu agente" detalle={carga.detalle} />
      </main>
    );
  }
  // La estación del recorrido (2 a 5) es la del editor; antes de la 2 se empieza por «Habilidades». Un recorrido
  // guardado con 4 pasos se retoma traducido: su paso 3 («Datos para probar») es el 4 de 5.
  const pasoInicial = pasoDelEditorEnLaBienvenida(recorrido);
  return <BienvenidaDelAgente datos={carga.datos} pasoInicial={pasoInicial} recorridoInicial={recorrido} />;
}
