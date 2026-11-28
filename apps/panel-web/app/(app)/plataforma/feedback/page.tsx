import Link from "next/link";
import { redirect } from "next/navigation";
import { Paperclip, X } from "lucide-react";

import { StatusBadge, estadoLegible } from "@/components/domain/status-badge";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { ListPage } from "@/components/templates/list-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { apiFetch } from "@/lib/api/server";
import type { components } from "@/lib/api/schema";
import type { FeedbackBandeja, FeedbackBandejaItem, Me } from "@/lib/api/types";
import {
  FEEDBACK_STATUS,
  TIPO_LABEL,
  antiguedad,
  consultaDeBandeja,
  enlaceDeBandeja,
  esUuid,
  nombreDePersona,
  veBandejaDeReportes,
  type FiltrosDeBandeja,
} from "@/lib/feedback-revision";
import { formatNumber } from "@/lib/format";

export const metadata = { title: "Reportes de clientes" };

const ESTADOS = [
  { value: "", label: "Todos" },
  { value: "recibido", label: "Recibidos" },
  { value: "en_revision", label: "En revisión" },
  { value: "aprobado", label: "Aprobados" },
  { value: "rechazado", label: "Rechazados" },
];
const TIPOS = [{ value: "", label: "Todos los tipos" }, ...Object.entries(TIPO_LABEL).map(([value, label]) => ({ value, label }))];

/** Etiquetas de las áreas (las secciones del panel más «Otra»), del catálogo del formulario. */
async function etiquetasDeArea(): Promise<Record<string, string>> {
  const res = await apiFetch<components["schemas"]["FeedbackCatalogo"]>("/feedback/catalogo");
  return res.ok ? Object.fromEntries(res.data.areas.map((a) => [a.clave, a.etiqueta])) : {};
}

/**
 * Plataforma → Reportes de clientes (SPEC-54, ADR-0213): los errores, mejoras e ideas que mandan los
 * negocios, del más reciente al más antiguo. La ve quien actúa como master (también el tester, sin
 * acciones); solo el master toma, aprueba con créditos de regalo o rechaza.
 */
export default async function BandejaDeReportesPage({ searchParams }: { searchParams: Promise<FiltrosDeBandeja> }) {
  const sp = await searchParams;
  const [me, lista, areas] = await Promise.all([
    apiFetch<Me>("/admin/me"),
    apiFetch<FeedbackBandeja>(`/platform/feedback/reports${consultaDeBandeja(sp)}`),
    etiquetasDeArea(),
  ]);
  if (!me.ok || !veBandejaDeReportes(me.data) || (!lista.ok && lista.status === 403)) redirect("/dashboard");
  const header = {
    title: "Reportes de clientes",
    description: "Errores, mejoras e ideas que mandan los negocios. Al aprobar uno, el negocio recibe créditos de regalo.",
  };
  if (!lista.ok) {
    return (
      <ListPage header={header}>
        {lista.status === 404 ? (
          <EmptyState
            title="Los reportes de clientes están apagados"
            description="Este entorno no tiene encendida la bandera FEEDBACK_ENABLED, así que los negocios todavía no pueden enviar reportes."
          />
        ) : (
          <ErrorDeCarga titulo="No pudimos cargar los reportes" detalle={lista.error} />
        )}
      </ListPage>
    );
  }

  const ahora = new Date();
  const { items, next_cursor } = lista.data;
  const negocio = esUuid(sp.tenant_id) ? sp.tenant_id : undefined;
  const nombreDelNegocio = negocio ? items.find((r) => r.tenant_id === negocio)?.tenant_name : undefined;
  const hrefDe = (r: FeedbackBandejaItem) => `/plataforma/feedback/${r.id}`;
  const area = (clave: string) => areas[clave] ?? estadoLegible(clave);

  const columns: Column<FeedbackBandejaItem>[] = [
    {
      key: "reporte",
      header: "Reporte",
      cell: (r) => (
        <div className="flex min-w-0 flex-col">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-headline">{r.titulo}</span>
            {r.adjuntos > 0 && (
              <span className="inline-flex items-center gap-0.5 text-xs text-text-soft" title={`${r.adjuntos} adjuntos`}>
                <Paperclip className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">Adjuntos:</span>
                {r.adjuntos}
              </span>
            )}
          </span>
          <span className="text-xs text-text-soft">
            {TIPO_LABEL[r.tipo]} · {area(r.area)}
          </span>
        </div>
      ),
    },
    {
      key: "negocio",
      header: "Negocio",
      cell: (r) => (
        <Link href={enlaceDeBandeja(sp, { tenant_id: r.tenant_id })} className="relative z-10 text-link hover:underline" title="Ver solo los reportes de este negocio">
          {r.tenant_name || "Sin nombre"}
        </Link>
      ),
    },
    { key: "autor", header: "Autor", cell: (r) => <span className="text-body">{nombreDePersona(r.autor)}</span> },
    {
      key: "estado",
      header: "Estado",
      cell: (r) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge value={r.estado} map={FEEDBACK_STATUS} />
          {r.estado === "aprobado" && r.creditos_otorgados != null && (
            <span className="text-xs tabular-nums text-text-soft">{formatNumber(r.creditos_otorgados)} cr</span>
          )}
          {r.estado === "en_revision" && r.revisor && <span className="text-xs text-text-soft">{nombreDePersona(r.revisor)}</span>}
        </div>
      ),
    },
    {
      key: "antiguedad",
      header: "Antigüedad",
      align: "right",
      cell: (r) => (
        <time dateTime={r.created_at} className="whitespace-nowrap tabular-nums text-text-soft">
          {antiguedad(r.created_at, ahora)}
        </time>
      ),
    },
  ];

  const filtros = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="max-sm:-mx-4 max-sm:w-[calc(100%+2rem)] max-sm:overflow-x-auto max-sm:px-4">
        <SegmentedControl
          label="Estado de los reportes"
          value={ESTADOS.some((e) => e.value === (sp.estado ?? "")) ? (sp.estado ?? "") : ""}
          options={ESTADOS.map((e) => ({ value: e.value, label: e.label, href: enlaceDeBandeja(sp, { estado: e.value || undefined }) }))}
          className="w-max"
        />
      </div>
      <div className="max-sm:-mx-4 max-sm:w-[calc(100%+2rem)] max-sm:overflow-x-auto max-sm:px-4">
        <SegmentedControl
          label="Tipo de reporte"
          value={TIPOS.some((t) => t.value === (sp.tipo ?? "")) ? (sp.tipo ?? "") : ""}
          options={TIPOS.map((t) => ({ value: t.value, label: t.label, href: enlaceDeBandeja(sp, { tipo: t.value || undefined }) }))}
          className="w-max"
        />
      </div>
      {negocio && (
        <Badge variant="accent" className="gap-1">
          Negocio: {nombreDelNegocio ?? "elegido"}
          <Link href={enlaceDeBandeja(sp, { tenant_id: undefined })} aria-label="Quitar el filtro de negocio" className="-mr-1 rounded-sm p-0.5 hover:bg-focus/10">
            <X className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Badge>
      )}
    </div>
  );

  return (
    <ListPage header={header} filters={filtros}>
      {items.length === 0 ? (
        <EmptyState
          title={sp.cursor ? "No hay más reportes" : "No hay reportes con estos filtros"}
          description={sp.cursor ? "Ya viste todos los de esta búsqueda." : "Cuando un negocio envíe un reporte, aparecerá aquí."}
        />
      ) : (
        <TablaResponsiva
          etiqueta="Reportes de clientes"
          caption="Reportes de clientes, del más reciente al más antiguo"
          columns={columns}
          rows={items}
          getRowKey={(r) => r.id}
          getRowHref={hrefDe}
          getRowLabel={(r) => `Abrir «${r.titulo}»`}
          filaCelular={(r) => ({
            titulo: r.titulo,
            detalle: `${r.tenant_name || "Sin nombre"} · ${TIPO_LABEL[r.tipo]} · ${antiguedad(r.created_at, ahora)}`,
            fin: <StatusBadge value={r.estado} map={FEEDBACK_STATUS} />,
            href: hrefDe(r),
          })}
        />
      )}
      {(next_cursor || sp.cursor) && (
        <div className="flex flex-wrap justify-end gap-2">
          {sp.cursor && (
            <Button asChild variant="outline" size="sm">
              <Link href={enlaceDeBandeja(sp)}>Volver a los más recientes</Link>
            </Button>
          )}
          {next_cursor && (
            <Button asChild variant="outline" size="sm">
              <Link href={enlaceDeBandeja(sp, { cursor: next_cursor })}>Más antiguos</Link>
            </Button>
          )}
        </div>
      )}
    </ListPage>
  );
}
