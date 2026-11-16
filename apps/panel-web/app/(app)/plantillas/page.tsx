import Link from "next/link";

import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { Me } from "@/lib/api/types";
import { categoriaPlantillaMetaLabel, idiomaLabel } from "@/lib/labels";
import {
  destinosDe,
  enlaceAPlantillasDeConexion,
  estadoDeCelda,
  origenesDe,
  origenesDeTodas,
  proveedorLabel,
  type ConexionDePlantillas,
  type FilaDePlantilla,
  type MatrizPlantillas,
} from "@/lib/plantillas-negocio";

import { AvisosSinPlantillaPorConexion } from "./_components/avisos-sin-plantilla";
import { CopiarPlantilla, CopiarTodas } from "./_components/copiar-plantillas";

export const metadata = { title: "Plantillas de WhatsApp" };

/**
 * Las plantillas del negocio en todas sus conexiones de WhatsApp (HU-CONN-21): cada plantilla una vez (nombre e
 * idioma) con su estado en cada conexión de Meta y de Twilio. WhatsApp aprueba cada plantilla por cuenta, así que
 * desde aquí se copian las aprobadas a las conexiones donde faltan. Crear, editar o borrar sigue en la pestaña
 * Plantillas de cada conexión.
 */
export default async function PlantillasDelNegocio() {
  const [res, me] = await Promise.all([apiFetch<MatrizPlantillas>("/admin/whatsapp-templates"), apiFetch<Me>("/admin/me")]);
  const header = (
    <PageHeader
      title="Plantillas de WhatsApp"
      description="Los mensajes que WhatsApp aprueba para escribir fuera de las 24 horas. Cada conexión necesita su propia copia aprobada."
      breadcrumbs={[{ label: "Mensajes", href: "/mensajes" }, { label: "Plantillas de WhatsApp" }]}
    />
  );
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorDeCarga titulo="No pudimos cargar las plantillas" detalle={res.error} />
      </div>
    );
  }
  const matriz = res.data;
  const conexiones = matriz.conexiones;
  const escribe = me.ok && (me.data.role === "master" || me.data.permissions?.connections === "write");
  const destinables = conexiones.filter((c) => c.destinable);

  if (conexiones.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState
          title="Todavía no tienes un WhatsApp con plantillas"
          description="Conecta un número de WhatsApp de Meta o vía Twilio para crear y copiar plantillas."
          action={
            <Button asChild variant="accent">
              <Link href="/conexiones">Ir a Conexiones</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const celda = (fila: FilaDePlantilla, c: ConexionDePlantillas) => {
    const x = fila.celdas[c.clave];
    if (!x) return null;
    const e = estadoDeCelda(x.estado);
    return (
      <div className="flex flex-col items-start gap-1">
        <Badge variant={e.tono}>{e.label}</Badge>
        {x.distinta && <span className="text-xs text-status-warning-fg">Con otro texto</span>}
        {x.motivo && x.estado !== "aprobada" && <span className="text-xs text-text-soft">{x.motivo}</span>}
      </div>
    );
  };
  const accion = (fila: FilaDePlantilla) =>
    escribe ? (
      <CopiarPlantilla
        nombre={fila.nombre}
        idioma={fila.idioma}
        origenes={origenesDe(fila, conexiones)}
        destinos={destinosDe(fila, conexiones)}
        conexiones={conexiones}
      />
    ) : null;

  const columns: Column<FilaDePlantilla>[] = [
    {
      key: "plantilla",
      header: "Plantilla",
      cell: (f) => (
        <span className="flex min-w-0 flex-col">
          <span className="font-medium text-headline">{f.nombre}</span>
          <span className="text-xs text-text-soft">
            {idiomaLabel(f.idioma)} · {categoriaPlantillaMetaLabel(f.categoria)}
          </span>
          <span className="line-clamp-2 text-xs text-text-soft">{f.cuerpo}</span>
        </span>
      ),
    },
    ...conexiones.map(
      (c): Column<FilaDePlantilla> => ({
        key: c.clave,
        header: (
          <Link href={enlaceAPlantillasDeConexion(c)} className="flex flex-col hover:underline">
            <span>{c.etiqueta}</span>
            <span className="text-xs font-normal text-text-soft">
              {proveedorLabel(c.proveedor)}
              {c.sandbox ? " · Sandbox" : !c.activa ? " · Pausada" : ""}
            </span>
          </Link>
        ),
        cell: (f) => celda(f, c),
      }),
    ),
    { key: "acciones", header: <span className="sr-only">Acciones</span>, align: "right", cell: accion },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Plantillas de WhatsApp"
        description="Los mensajes que WhatsApp aprueba para escribir fuera de las 24 horas. Cada conexión necesita su propia copia aprobada."
        breadcrumbs={[{ label: "Mensajes", href: "/mensajes" }, { label: "Plantillas de WhatsApp" }]}
        actions={
          escribe && destinables.length > 0 ? (
            <CopiarTodas origenes={origenesDeTodas(matriz)} destinos={destinables} conexiones={conexiones} />
          ) : undefined
        }
      />
      <AvisosSinPlantillaPorConexion matriz={matriz} />
      {conexiones.some((c) => c.sandbox) && (
        <p role="status" className="rounded-md border border-status-info-border bg-status-info-bg px-4 py-3 text-sm text-headline">
          El Sandbox de Twilio solo usa sus plantillas preaprobadas: no recibe copias.
        </p>
      )}
      <TablaResponsiva
        etiqueta="Plantillas de WhatsApp por conexión"
        columns={columns}
        rows={matriz.filas}
        getRowKey={(f) => `${f.nombre}/${f.idioma}`}
        emptyTitle="Todavía no hay plantillas"
        emptyDescription="Créalas en la pestaña Plantillas de una conexión y luego cópialas a las demás desde aquí."
        filaCelular={(f) => ({
          titulo: `${f.nombre} · ${idiomaLabel(f.idioma)}`,
          detalle: conexiones
            .map((c) => {
              const x = f.celdas[c.clave];
              return x ? `${c.etiqueta}: ${estadoDeCelda(x.estado).label}${x.distinta ? " (otro texto)" : ""}` : null;
            })
            .filter(Boolean)
            .join(" · "),
          accion: accion(f),
        })}
      />
    </div>
  );
}
