"use client";

import { useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Tabs } from "@/components/ui/tabs";
import type { CatalogoDeMensajes, MensajeDelCatalogo } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import {
  canalesLabel,
  contarPorTipo,
  detalleDeEstado,
  enlaceAlEditor,
  estadoDeMensaje,
  filtrarPorTipo,
  motivoOmitido,
  nombreDeMensaje,
  tipoAyuda,
  tipoLabel,
  tiposVisibles,
} from "@/lib/mensajes";

const MAX_VARIABLES_VISIBLES = 3;

function Variables({ variables }: { variables: string[] }) {
  if (variables.length === 0) return <span className="text-text-soft">—</span>;
  const visibles = variables.slice(0, MAX_VARIABLES_VISIBLES);
  const resto = variables.length - visibles.length;
  return (
    <span className="flex flex-wrap items-center gap-1">
      {visibles.map((v) => (
        <code key={v} className="rounded-sm bg-hover px-1.5 py-0.5 font-mono text-xs text-body">
          {v}
        </code>
      ))}
      {resto > 0 && <span className="text-xs text-text-soft">+{resto}</span>}
    </span>
  );
}

const COLUMNAS: Column<MensajeDelCatalogo>[] = [
  {
    key: "mensaje",
    header: "Mensaje",
    cell: (m) => {
      const href = enlaceAlEditor(m.fuente);
      const nombre = nombreDeMensaje(m);
      return (
        <span className="flex max-w-md flex-col gap-0.5">
          {href ? (
            <Link href={href} className="font-medium text-link underline-offset-4 hover:underline">
              {nombre}
            </Link>
          ) : (
            <span className="font-medium text-headline">{nombre}</span>
          )}
          {m.resumen && <span className="truncate text-xs text-text-soft">{m.resumen}</span>}
        </span>
      );
    },
  },
  { key: "tipo", header: "Tipo", cell: (m) => tipoLabel(m.tipo) },
  {
    key: "estado",
    header: "Estado",
    cell: (m) => {
      const { etiqueta, tono } = estadoDeMensaje(m);
      const detalle = detalleDeEstado(m);
      return (
        <span className="flex flex-col items-start gap-0.5">
          {tono === "neutral" ? <Badge>{etiqueta}</Badge> : <Badge variant={tono}>{etiqueta}</Badge>}
          {detalle && <span className="text-xs text-text-soft">{detalle}</span>}
        </span>
      );
    },
  },
  { key: "canales", header: "Canales", cell: (m) => canalesLabel(m.canales_soportados) },
  { key: "variables", header: "Variables", cell: (m) => <Variables variables={m.variables} /> },
  {
    key: "actualizado",
    header: "Actualizado",
    info: "En las plantillas de WhatsApp es la última sincronización con Meta: el estado puede haber cambiado desde entonces.",
    cell: (m) => (m.actualizado_en ? formatDateTime(m.actualizado_en) : "—"),
  },
];

/** Lista unificada de mensajes con filtro por tipo. Solo lectura: cada fila enlaza a su editor. */
export function CatalogoMensajes({ catalogo }: { catalogo: CatalogoDeMensajes }) {
  const [tipo, setTipo] = useState("todos");
  const cuentas = contarPorTipo(catalogo.mensajes);
  const pestanas = [
    { id: "todos", label: `Todos (${catalogo.mensajes.length})` },
    ...tiposVisibles(catalogo.mensajes, catalogo.omitidas).map((t) => ({ id: t, label: `${tipoLabel(t)} (${cuentas[t] ?? 0})` })),
  ];
  const filas = filtrarPorTipo(catalogo.mensajes, tipo);

  return (
    <div className="flex flex-col gap-4">
      {catalogo.omitidas.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-1 pt-5 text-sm text-body">
            <p className="font-medium text-headline">Hay mensajes que no se muestran</p>
            <ul className="list-disc pl-5">
              {catalogo.omitidas.map((o) => (
                <li key={o.tipo}>{motivoOmitido(o)}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      {catalogo.truncado.length > 0 && (
        <p role="status" className="rounded-md bg-status-warning-bg p-3 text-sm text-status-warning-fg">
          La lista de {catalogo.truncado.map(tipoLabel).join(" y ").toLowerCase()} es muy larga y se muestra recortada.
        </p>
      )}
      <Tabs items={pestanas} value={tipo} onValueChange={setTipo} />
      {tipo !== "todos" && <p className="text-sm text-text-soft">{tipoAyuda(tipo)}</p>}
      <DataTable
        columns={COLUMNAS}
        rows={filas}
        getRowKey={(m) => m.id}
        caption="Mensajes del negocio"
        emptyTitle="Todavía no hay mensajes de este tipo"
        emptyDescription="Cuando crees uno en su editor, aparecerá aquí."
      />
    </div>
  );
}
