import { notFound, redirect } from "next/navigation";

import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { apiFetch } from "@/lib/api/server";
import type { Me, PrimerosPasos } from "@/lib/api/types";
import type { PasoId } from "@/lib/agentes-editor";
import { cargarEditorDeAgente } from "@/lib/editor-de-agente-datos";
import { PASOS, PASOS_DEL_NEGOCIO } from "@/lib/onboarding";

import { BienvenidaDelAgente } from "../../_components/bienvenida-del-agente";

export const metadata = { title: "Primeros pasos" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Pasos 5 a 9 de la bienvenida (HU-UX-23): el agente que creó el recorrido, con el editor a pantalla completa.
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
  // El paso del recorrido (5 a 9) es el del editor; antes de 5 se empieza por «Habilidades».
  const id9 = PASOS[Math.min(Math.max(recorrido.paso, PASOS_DEL_NEGOCIO + 1), PASOS.length) - 1].id;
  const pasoInicial = id9 as PasoId;
  return <BienvenidaDelAgente datos={carga.datos} pasoInicial={pasoInicial} recorridoInicial={recorrido} />;
}
