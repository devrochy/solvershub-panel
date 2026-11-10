import Link from "next/link";

import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { DatosDePruebaDelModulo } from "@/components/domain/datos-de-prueba-modulo";
import { type Column } from "@/components/ui/data-table";
import { KpiTile } from "@/components/ui/kpi-tile";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch, getBusinessTimezone } from "@/lib/api/server";
import type { EstadoDatosDePruebaModulo, Me } from "@/lib/api/types";
import { agruparPromesas, fechaDeHoy, type PromesaDeAgenda } from "@/lib/cobranza/agenda";
import { montoDeResumen } from "@/lib/cobranza/presentacion";
import { formatCop, formatNumber } from "@/lib/format";

export const metadata = { title: "Cobranza" };

type Summary = { kpis: { label: string; value: string }[] };
type FilaDeReporte = { cartera: string; clientes: number; saldo: number; vencidas: number; cobrado: number; caja: number };
type CarteraBasica = { id: string; nombre: string; gestor: string | null };

export default async function CobranzaPage() {
  const [summaryRes, datosPruebaRes, meRes, promesasRes, reportesRes, carterasRes, zona] = await Promise.all([
    apiFetch<Summary>("/pack/cobranza/summary"),
    apiFetch<EstadoDatosDePruebaModulo>("/admin/datos-de-prueba/cobranza"),
    apiFetch<Me>("/admin/me"),
    apiFetch<PromesaDeAgenda[]>("/pack/cobranza/promises"),
    apiFetch<{ filas: FilaDeReporte[] }>("/pack/cobranza/reports"),
    apiFetch<CarteraBasica[]>("/pack/cobranza/portfolios"),
    getBusinessTimezone(),
  ]);
  const header = <PageHeader title="Cobranza" />;
  if (!summaryRes.ok) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorDeCarga titulo="No se pudo cargar Cobranza" detalle={summaryRes.error} />
      </div>
    );
  }

  const kpi = (etiqueta: string) => summaryRes.data.kpis.find((k) => k.label === etiqueta)?.value;
  const saldo = montoDeResumen(kpi("Saldo en cartera"));
  const mora = montoDeResumen(kpi("Mora"));
  const partes = [
    `${kpi("Carteras") ?? "0"} carteras`,
    `${kpi("Clientes") ?? "0"} clientes`,
    `Gastos de 30 días: ${formatCop(montoDeResumen(kpi("Gastos (30 días)")))}`,
  ];

  const permisos = meRes.ok ? (meRes.data.permissions ?? {}) : {};
  const destino = (seccion: string, href: string) => (permisos[seccion] ? href : undefined);

  const paraHoy = promesasRes.ok
    ? agruparPromesas(promesasRes.data, fechaDeHoy(zona)).grupos.hoy
    : [];
  const valorDeHoy = paraHoy.reduce((total, p) => total + p.valor_prometido, 0);

  const carteras = carterasRes.ok ? carterasRes.data : [];
  const carteraDe = (nombre: string) => {
    const coinciden = carteras.filter((c) => c.nombre === nombre);
    return coinciden.length === 1 ? coinciden[0] : undefined;
  };
  const filas = reportesRes.ok ? reportesRes.data.filas : [];
  const hrefDe = (fila: FilaDeReporte) => {
    const cartera = carteraDe(fila.cartera);
    return cartera ? `/cobranza/carteras/${cartera.id}` : "/cobranza/carteras";
  };

  const columns: Column<FilaDeReporte>[] = [
    {
      key: "cartera",
      header: "Cartera",
      cell: (f) => (
        <div className="flex flex-col">
          <span className="font-medium text-headline">{f.cartera}</span>
          <span className="text-xs text-text-soft">{carteraDe(f.cartera)?.gestor ?? "Sin gestor"}</span>
        </div>
      ),
    },
    { key: "clientes", header: "Clientes", align: "right", cell: (f) => formatNumber(f.clientes) },
    { key: "saldo", header: "Saldo", align: "right", cell: (f) => formatCop(f.saldo) },
    { key: "vencidas", header: "Cuotas vencidas", align: "right", cell: (f) => formatNumber(f.vencidas) },
    { key: "cobrado", header: "Cobrado", align: "right", cell: (f) => formatCop(f.cobrado) },
    { key: "caja", header: "Caja", align: "right", cell: (f) => formatCop(f.caja) },
  ];

  return (
    <div className="flex flex-col gap-6">
      {header}

      {datosPruebaRes.ok && (
        <DatosDePruebaDelModulo modulo="cobranza" estado={datosPruebaRes.data} />
      )}

      {paraHoy.length > 0 && (
        <Link
          href="/cobranza/promesas"
          className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-headline transition-colors hover:bg-hover"
        >
          <span>
            <strong className="font-semibold">{paraHoy.length === 1 ? "1 promesa" : `${paraHoy.length} promesas`}</strong>{" "}
            {paraHoy.length === 1 ? "vence" : "vencen"} hoy, por {formatCop(valorDeHoy)}
          </span>
          <span className="font-medium text-link">Ver promesas ›</span>
        </Link>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <KpiTile
          label="Saldo en cartera"
          value={formatCop(saldo)}
          hint={`${kpi("Préstamos vigentes") ?? "0"} préstamos vigentes`}
          size="hero"
          href={destino("pack_cobranza:carteras", "/cobranza/carteras")}
        />
        <KpiTile
          label="Mora"
          value={formatCop(mora)}
          hint={saldo > 0 ? `${((mora / saldo) * 100).toLocaleString("es-CO", { maximumFractionDigits: 1 })} % del saldo` : undefined}
          tone={mora > 0 ? "danger" : "default"}
          size="hero"
          href={destino("pack_cobranza:reportes", "/cobranza/reportes")}
        />
        <KpiTile
          label="Cobrado, 7 días"
          value={formatCop(montoDeResumen(kpi("Cobrado (7 días)")))}
          size="hero"
          href={destino("pack_cobranza:cobros", "/cobranza/pagos")}
        />
      </div>

      <p className="text-sm text-body">{partes.join(" · ")}</p>

      {filas.length > 0 && (
        <section aria-labelledby="por-cartera" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="por-cartera" className="font-display text-sh-block text-headline">
              Por cartera
            </h2>
            {destino("pack_cobranza:carteras", "/cobranza/carteras") && (
              <Link href="/cobranza/carteras" className="text-sm text-link hover:underline">
                Ver carteras
              </Link>
            )}
          </div>
          <TablaResponsiva
            etiqueta="Carteras"
            columns={columns}
            rows={filas}
            getRowKey={(f) => f.cartera}
            getRowHref={destino("pack_cobranza:carteras", "/") ? hrefDe : undefined}
            getRowLabel={(f) => `Abrir la cartera ${f.cartera}`}
            filaCelular={(f) => ({
              titulo: f.cartera,
              detalle: `${formatNumber(f.vencidas)} cuotas vencidas`,
              fin: formatCop(f.saldo),
              href: destino("pack_cobranza:carteras", hrefDe(f)),
            })}
          />
        </section>
      )}
    </div>
  );
}
