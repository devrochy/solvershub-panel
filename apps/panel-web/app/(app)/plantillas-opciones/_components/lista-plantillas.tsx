"use client";

import { useState } from "react";

import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import type { OpcionesPlantillaResumen } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { estadoPlantillaOpcionesLabel } from "@/lib/labels";

import { CrearPlantilla } from "./crear-plantilla";
import { SinBandera } from "./sin-bandera";

const MIGAS = [{ label: "Mensajes", href: "/mensajes" }, { label: "Plantillas con opciones" }];

const hrefDe = (p: OpcionesPlantillaResumen) => `/plantillas-opciones/${encodeURIComponent(p.clave)}`;

function Estado({ p }: { p: OpcionesPlantillaResumen }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Badge variant={p.estado === "published" ? "success" : p.estado === "retired" ? "warning" : "neutral"}>{estadoPlantillaOpcionesLabel(p.estado)}</Badge>
      {p.tiene_borrador_sin_publicar && p.estado !== "draft" && <Badge variant="info">Cambios sin publicar</Badge>}
    </span>
  );
}

/**
 * Lista de plantillas con opciones del negocio (HU-OPC-06, PLA-04 y PLA-11): nombre, estado y versión vigente; la
 * clave queda dentro de cada plantilla. La fila entera la abre, y en el celular es una fila de un toque.
 */
export function ListaPlantillas({
  plantillas,
  puedeEscribir,
  enlaceActivar,
  banner,
}: {
  plantillas: OpcionesPlantillaResumen[];
  puedeEscribir: boolean;
  /** Enlace al interruptor del negocio, solo para el master: se ofrece si la función no está activada. */
  enlaceActivar?: string | null;
  /** Alerta de plantillas faltantes (servidor), encima de la tabla. */
  banner?: React.ReactNode;
}) {
  const [banderaApagada, setBanderaApagada] = useState(false);

  const columnas: Column<OpcionesPlantillaResumen>[] = [
    { key: "nombre", header: "Plantilla", cell: (p) => <span className="font-medium text-headline">{p.nombre || p.clave}</span> },
    { key: "estado", header: "Estado", cell: (p) => <Estado p={p} /> },
    { key: "version", header: "Versión vigente", cell: (p) => (p.version_vigente === null ? "Sin publicar" : `Versión ${p.version_vigente}`) },
    { key: "actualizada", header: "Actualizada", cell: (p) => formatDateTime(p.actualizada_en) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Plantillas con opciones"
        helpSection="plantillas_opciones"
        description="Mensajes con botones: cada uno hace algo de tu asistente cuando el cliente lo toca."
        breadcrumbs={MIGAS}
        actions={puedeEscribir && !banderaApagada ? <CrearPlantilla onBanderaApagada={() => setBanderaApagada(true)} /> : undefined}
      />
      {banderaApagada ? (
        <SinBandera enlaceActivar={enlaceActivar} />
      ) : (
        <>
          {banner}
          {!puedeEscribir && (
            <p className="rounded-lg bg-surface-2 p-3 text-sm text-body">
              Puedes ver las plantillas, pero solo el propietario del negocio puede crearlas, cambiarlas y publicarlas.
            </p>
          )}
          {plantillas.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <h2 className="font-display text-sh-block text-headline">Todavía no tienes plantillas con opciones</h2>
                <p className="max-w-md text-sm text-text-soft">
                  {puedeEscribir
                    ? "Crea la primera: escribe el mensaje, agrega hasta 10 opciones y elige qué hace cada una."
                    : "Cuando el propietario cree una, la verás aquí."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <TablaResponsiva
              etiqueta="Plantillas con opciones"
              caption="Plantillas con opciones"
              columns={columnas}
              rows={plantillas}
              getRowKey={(p) => p.clave}
              getRowHref={hrefDe}
              getRowLabel={(p) => `Abrir la plantilla ${p.nombre || p.clave}`}
              filaCelular={(p) => ({
                titulo: p.nombre || p.clave,
                detalle: `${estadoPlantillaOpcionesLabel(p.estado)}${p.version_vigente === null ? "" : ` · versión ${p.version_vigente}`}${p.tiene_borrador_sin_publicar && p.estado !== "draft" ? " · cambios sin publicar" : ""}`,
                href: hrefDe(p),
              })}
            />
          )}
        </>
      )}
    </div>
  );
}
