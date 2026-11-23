import Link from "next/link";
import { notFound } from "next/navigation";

import { OpcionesDelCoordinador } from "@/components/domain/agentes/opciones-del-coordinador";
import { EditorDeAgente } from "@/components/domain/agentes/recorrido/editor-de-agente";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { pasoDesdeParametro } from "@/lib/agentes-editor";
import { AvisoAlSalir } from "@/lib/cambios-sin-guardar";
import { cargarOpcionesDelCoordinador } from "@/lib/coordinador-opciones";
import { cargarEditorDeAgente } from "@/lib/editor-de-agente-datos";

export const metadata = { title: "Personalizar agente" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Personalizar un agente especialista con el recorrido común (HU-AOS-24, HU-AOS-78). Ruta canónica
 * desde HU-AOS-80 (D-SPEC-47-3); `/agentes/[id]/editar` redirige aquí.
 */
export default async function PersonalizarAgentePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paso?: string; modo?: string }>;
}) {
  const { id } = await params;
  const { paso, modo } = await searchParams;
  // `?modo=crear` (HU-AOS-77): la continuación de Nuevo agente, con los pasos en orden.
  const creando = modo === "crear";
  // `?paso=` abre en ese paso (el asistente de HU-AOS-54 deja al dueño en «Publicar»); los ids del
  // editor anterior se traducen al paso que los contiene.
  const pasoInicial = pasoDesdeParametro(paso);
  if (!UUID.test(id)) notFound();
  const carga = await cargarEditorDeAgente(id);
  if (carga.estado === "no_existe") notFound();
  if (carga.estado === "error") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Personalizar agente" breadcrumbs={[{ label: "Agentes", href: "/agentes" }, { label: "Personalizar" }]} tabs={false} />
        <ErrorDeCarga titulo="No pudimos abrir Personalizar" detalle={carga.detalle} />
      </div>
    );
  }
  const titulo = creando ? `Nuevo agente: ${carga.nombre}` : `Personalizar ${carga.nombre}`;
  const migas = creando
    ? [{ label: "Agentes", href: "/agentes" }, { label: "Nuevo agente" }]
    : [{ label: "Agentes", href: "/agentes" }, { label: carga.nombre, href: `/agentes/${id}` }, { label: "Personalizar" }];
  const volver = (
    <Button asChild variant="outline">
      <Link href={`/agentes/${id}`}>{creando ? "Terminar después" : `Volver a ${carga.nombre}`}</Link>
    </Button>
  );
  if (carga.estado === "no_especialista" && carga.coordinador) {
    // HU-AOS-98 (ADR-0211): las opciones propias del Coordinador, sin borrador ni recorrido por pasos.
    const opciones = await cargarOpcionesDelCoordinador();
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={titulo} breadcrumbs={migas} tabs={false} actions={volver} />
        {opciones.estado === "ok" ? (
          <OpcionesDelCoordinador inicial={opciones.opciones} agenteId={id} puedeEditar={opciones.puedeEditar} />
        ) : (
          <ErrorDeCarga titulo="No pudimos abrir las opciones del Coordinador" detalle={opciones.detalle} />
        )}
      </div>
    );
  }
  if (carga.estado === "no_especialista") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={titulo} breadcrumbs={migas} tabs={false} actions={volver} />
        <p className="text-sm text-body">
          Este agente lo administra el sistema (Coordinador o back-office): el editor por pasos es para especialistas.
        </p>
      </div>
    );
  }

  // HU-AOS-78: con cambios sin guardar, salir del editor (o cerrar la pestaña) pide confirmar.
  if (creando) {
    // HU-AOS-86: Nuevo agente en la ruta de lanzamiento. Arriba solo las migas; el `h1` es la pregunta de la
    // estación y «Terminar después» va junto a la ruta (lo pone el editor).
    return (
      <AvisoAlSalir>
        <div className="flex flex-col gap-4">
          <Breadcrumbs items={migas} />
          <EditorDeAgente {...carga.datos} pasoInicial={pasoInicial} modo="crear" />
        </div>
      </AvisoAlSalir>
    );
  }
  return (
    <AvisoAlSalir>
      <div className="flex flex-col gap-6">
        {/* AGT-11: una tarea enfocada, sin las pestañas de la sección y con una salida a la ficha. */}
        <PageHeader
          title={titulo}
          description="Ve a cualquier paso, guarda cuando quieras y publica la versión nueva al final."
          breadcrumbs={migas}
          tabs={false}
          actions={volver}
        />
        <EditorDeAgente {...carga.datos} pasoInicial={pasoInicial} modo="editar" />
      </div>
    </AvisoAlSalir>
  );
}
