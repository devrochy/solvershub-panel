"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FormFeedback } from "@/components/ui/form-feedback";
import type { FeedbackPagina, FeedbackReporteResumen } from "@/lib/api/types";
import { TIPOS_DE_REPORTE, creditosDelReporte } from "@/lib/feedback";
import { formatDate } from "@/lib/format";

import { EstadoDelReporte } from "./estado-del-reporte";

/**
 * Lista de «Mis reportes»: la primera página llega del servidor y «Cargar más» sigue el cursor por el BFF.
 * La fila abre el detalle.
 */
export function ListaDeReportes({
  inicial,
  query,
  areas,
  zona,
  propios,
  adminId,
}: {
  inicial: FeedbackPagina;
  /** Query de la página (alcance y estado) para pedir las siguientes con el cursor. */
  query: string;
  areas: Record<string, string>;
  zona: string;
  /** `alcance=mios`: el vacío invita a reportar; en los del negocio marca cuáles son tuyos. */
  propios: boolean;
  adminId: string | null;
}) {
  const [items, setItems] = useState(inicial.items);
  const [cursor, setCursor] = useState(inicial.next_cursor);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargarMas() {
    if (!cursor || cargando) return;
    setCargando(true);
    setError(null);
    const qs = new URLSearchParams(query.replace(/^\?/, ""));
    qs.set("cursor", cursor);
    try {
      const res = await fetch(`/api/feedback/reports?${qs.toString()}`);
      const cuerpo = (await res.json().catch(() => null)) as (FeedbackPagina & { error?: string }) | null;
      if (!res.ok || !cuerpo?.items) {
        setError(cuerpo?.error ?? "No pudimos cargar más reportes. Vuelve a intentarlo.");
        return;
      }
      setItems((previos) => [...previos, ...cuerpo.items.filter((n) => !previos.some((p) => p.id === n.id))]);
      setCursor(cuerpo.next_cursor);
    } catch {
      setError("No pudimos contactar el servidor. Vuelve a intentarlo.");
    } finally {
      setCargando(false);
    }
  }

  const columnas: Column<FeedbackReporteResumen>[] = [
    {
      key: "reporte",
      header: "Reporte",
      className: "w-full max-w-0",
      cell: (r) => (
        <span className="flex min-w-48 flex-col">
          <span className="truncate font-medium text-headline" title={r.titulo}>
            {r.titulo}
          </span>
          <span className="truncate text-xs text-text-soft">
            {areas[r.area] ?? r.area}
            {!propios && adminId === r.autor_admin_id ? " · tuyo" : ""}
          </span>
        </span>
      ),
    },
    { key: "tipo", header: "Tipo", cell: (r) => <span className="whitespace-nowrap">{TIPOS_DE_REPORTE[r.tipo]}</span> },
    { key: "fecha", header: "Enviado", cell: (r) => <span className="whitespace-nowrap">{formatDate(r.created_at, zona)}</span> },
    { key: "estado", header: "Estado", cell: (r) => <EstadoDelReporte reporte={r} /> },
    {
      key: "creditos",
      header: "Créditos",
      align: "right",
      cell: (r) => <span className="whitespace-nowrap tabular-nums">{creditosDelReporte(r)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        columns={columnas}
        rows={items}
        getRowKey={(r) => r.id}
        getRowHref={(r) => `/reportes/${r.id}`}
        getRowLabel={(r) => `Abrir el reporte «${r.titulo}»`}
        serverPaginated
        caption="Reportes enviados"
        emptyTitle={propios ? "Todavía no enviaste reportes" : "No hay reportes con este filtro"}
        emptyDescription={
          propios
            ? "¿Algo no funciona o se te ocurre una mejora? Repórtalo desde el menú de tu cuenta."
            : "Prueba con otro estado."
        }
      />
      {cursor && (
        <div className="flex justify-center">
          <Button type="button" variant="outline" onClick={() => void cargarMas()} loading={cargando}>
            Cargar más
          </Button>
        </div>
      )}
      <FormFeedback error={error} />
    </div>
  );
}
