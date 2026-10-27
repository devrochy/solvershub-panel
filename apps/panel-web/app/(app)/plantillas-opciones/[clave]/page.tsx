import { notFound } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { Me, OpcionesAccionDelCatalogo, OpcionesPlantilla, OpcionesVariable } from "@/lib/api/types";
import { CLAVE_VALIDA, esBanderaApagada, puedeEscribirOpciones } from "@/lib/plantillas-opciones";

import { EditorDePlantilla } from "../_components/editor";
import { SinBandera } from "../_components/sin-bandera";

export const metadata = { title: "Plantilla con opciones" };

export default async function EditorDePlantillaPage({ params }: { params: Promise<{ clave: string }> }) {
  const { clave } = await params;
  if (!CLAVE_VALIDA.test(clave)) notFound();

  const [plantilla, acciones, variables, me] = await Promise.all([
    apiFetch<OpcionesPlantilla>(`/plantillas-opciones/${clave}`),
    apiFetch<{ acciones: OpcionesAccionDelCatalogo[] }>("/plantillas-opciones/catalogo-acciones"),
    apiFetch<{ variables: OpcionesVariable[] }>("/plantillas-opciones/catalogo-variables"),
    apiFetch<Me>("/admin/me"),
  ]);

  const falla = [plantilla, acciones, variables].find((r) => !r.ok);
  if (falla && !falla.ok) {
    if (falla.status === 404 && falla.code === "not_found") notFound();
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Plantilla con opciones"
          breadcrumbs={[{ label: "Plantillas de WhatsApp", href: "/plantillas" }, { label: "Plantillas con opciones", href: "/plantillas-opciones" }, { label: clave }]}
        />
        {esBanderaApagada(falla) ? (
          <SinBandera />
        ) : (
          <Card>
            <CardContent role="alert" className="pt-5 text-sm text-status-danger-fg">
              No se pudo cargar la plantilla: {falla.error}
            </CardContent>
          </Card>
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
      puedeEscribir={me.ok && puedeEscribirOpciones(me.data)}
    />
  );
}
