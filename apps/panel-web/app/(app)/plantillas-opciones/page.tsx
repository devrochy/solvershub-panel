import { MissingTemplatesBanner } from "@/components/domain/missing-templates-banner";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { Me, OpcionesPlantillaResumen } from "@/lib/api/types";
import { enlaceAlInterruptor } from "@/lib/opciones-directas-bandera";
import { esBanderaApagada, puedeEscribirOpciones } from "@/lib/plantillas-opciones";

import { ListaPlantillas } from "./_components/lista-plantillas";
import { SinBandera } from "./_components/sin-bandera";

export const metadata = { title: "Plantillas con opciones" };

const MIGAS = [{ label: "Plantillas de WhatsApp", href: "/plantillas" }, { label: "Plantillas con opciones" }];

export default async function PlantillasConOpcionesPage() {
  const [res, me] = await Promise.all([
    apiFetch<{ plantillas: OpcionesPlantillaResumen[] }>("/plantillas-opciones"),
    apiFetch<Me>("/admin/me"),
  ]);

  const enlaceActivar = me.ok ? enlaceAlInterruptor(me.data) : null;

  if (!res.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Plantillas con opciones" breadcrumbs={MIGAS} />
        {esBanderaApagada(res) ? (
          <SinBandera enlaceActivar={enlaceActivar} />
        ) : (
          <Card>
            <CardContent role="alert" className="pt-5 text-sm text-status-danger-fg">
              No se pudieron cargar las plantillas: {res.error}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <ListaPlantillas
      plantillas={res.data.plantillas}
      puedeEscribir={me.ok && puedeEscribirOpciones(me.data)}
      enlaceActivar={enlaceActivar}
      banner={<MissingTemplatesBanner />}
    />
  );
}
