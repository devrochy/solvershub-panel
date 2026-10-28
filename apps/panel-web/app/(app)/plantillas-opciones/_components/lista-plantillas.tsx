"use client";

import { useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import type { OpcionesPlantillaResumen } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { estadoPlantillaOpcionesLabel } from "@/lib/labels";

import { CrearPlantilla } from "./crear-plantilla";
import { SinBandera } from "./sin-bandera";

/** Lista de plantillas con opciones del negocio (HU-OPC-06): clave, nombre, estado y versión vigente. */
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
    {
      key: "nombre",
      header: "Plantilla",
      cell: (p) => (
        <Link href={`/plantillas-opciones/${encodeURIComponent(p.clave)}`} className="flex flex-col font-medium text-link underline-offset-4 hover:underline">
          {p.nombre || p.clave}
          <span className="font-mono text-xs font-normal text-text-soft">{p.clave}</span>
        </Link>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (p) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <Badge variant={p.estado === "published" ? "success" : p.estado === "retired" ? "warning" : "neutral"}>
            {estadoPlantillaOpcionesLabel(p.estado)}
          </Badge>
          {p.tiene_borrador_sin_publicar && p.estado !== "draft" && <Badge variant="info">Cambios sin publicar</Badge>}
        </span>
      ),
    },
    { key: "version", header: "Versión vigente", cell: (p) => (p.version_vigente === null ? "—" : `Versión ${p.version_vigente}`) },
    { key: "actualizada", header: "Actualizada", cell: (p) => formatDateTime(p.actualizada_en) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Plantillas con opciones"
        helpSection="plantillas_opciones"
        description="Mensajes con botones que ejecutan una acción de tu asistente cuando el cliente los toca. Los armas aquí y los envías a tus clientes."
        breadcrumbs={[{ label: "Plantillas de WhatsApp", href: "/plantillas" }, { label: "Plantillas con opciones" }]}
        actions={puedeEscribir && !banderaApagada ? <CrearPlantilla onBanderaApagada={() => setBanderaApagada(true)} /> : undefined}
      />
      {banderaApagada ? (
        <SinBandera enlaceActivar={enlaceActivar} />
      ) : (
        <>
          {banner}
          {!puedeEscribir && (
            <p className="rounded-md bg-surface-2 p-3 text-sm text-body">
              Puedes ver las plantillas, pero solo el propietario del negocio puede crearlas, cambiarlas y publicarlas.
            </p>
          )}
          {plantillas.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <p className="text-sm font-medium text-headline">Todavía no tienes plantillas con opciones</p>
                <p className="max-w-md text-sm text-text-soft">
                  {puedeEscribir
                    ? "Crea la primera: escribe el mensaje, agrega hasta 10 opciones y elige qué hace cada una."
                    : "Cuando el propietario cree una, la verás aquí."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <DataTable columns={columnas} rows={plantillas} getRowKey={(p) => p.clave} caption="Plantillas con opciones" />
          )}
        </>
      )}
    </div>
  );
}
