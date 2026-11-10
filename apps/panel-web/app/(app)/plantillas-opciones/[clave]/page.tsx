import { notFound } from "next/navigation";

import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { HealthConnectionMeta, Me, OpcionesAccionDelCatalogo, OpcionesPlantilla, OpcionesVariable } from "@/lib/api/types";
import { enlaceAlInterruptor } from "@/lib/opciones-directas-bandera";
import { CLAVE_VALIDA, esBanderaApagada, puedeEscribirOpciones } from "@/lib/plantillas-opciones";

import { EditorDePlantilla } from "../_components/editor";
import { SinBandera } from "../_components/sin-bandera";

export const metadata = { title: "Plantilla con opciones" };

export default async function EditorDePlantillaPage({ params }: { params: Promise<{ clave: string }> }) {
  const { clave } = await params;
  if (!CLAVE_VALIDA.test(clave)) notFound();

  const [plantilla, acciones, variables, me, salud] = await Promise.all([
    apiFetch<OpcionesPlantilla>(`/plantillas-opciones/${clave}`),
    apiFetch<{ acciones: OpcionesAccionDelCatalogo[] }>("/plantillas-opciones/catalogo-acciones"),
    apiFetch<{ variables: OpcionesVariable[] }>("/plantillas-opciones/catalogo-variables"),
    apiFetch<Me>("/admin/me"),
    apiFetch<{ connections: HealthConnectionMeta[] }>("/admin/meta/health"),
  ]);

  const enlaceActivar = me.ok ? enlaceAlInterruptor(me.data) : null;

  const falla = [plantilla, acciones, variables].find((r) => !r.ok);
  if (falla && !falla.ok) {
    if (falla.status === 404 && falla.code === "not_found") notFound();
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Plantilla con opciones"
          breadcrumbs={[{ label: "Mensajes", href: "/mensajes" }, { label: "Plantillas con opciones", href: "/plantillas-opciones" }]}
        />
        {esBanderaApagada(falla) ? (
          <SinBandera enlaceActivar={enlaceActivar} />
        ) : (
          <ErrorDeCarga titulo="No pudimos cargar la plantilla" detalle={falla.error} />
        )}
      </div>
    );
  }
  if (!plantilla.ok || !acciones.ok || !variables.ok) return null;

  return (
    <EditorDePlantilla
      inicial={plantilla.data}
      acciones={acciones.data.acciones}
      variables={variables.data.variables}
      // Si la salud de Meta no carga, el diálogo explica que no hay conexión lista en vez de romper la pantalla.
      conexiones={salud.ok ? (salud.data.connections ?? []) : []}
      puedeEscribir={me.ok && puedeEscribirOpciones(me.data)}
      enlaceActivar={enlaceActivar}
    />
  );
}
