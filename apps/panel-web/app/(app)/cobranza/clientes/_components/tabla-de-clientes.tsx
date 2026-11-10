import { TablaCobranza } from "@/components/domain/cobranza/tabla-cobranza";
import { StatusBadge } from "@/components/domain/status-badge";
import { type Column } from "@/components/ui/data-table";
import { RIESGO_STATUS, etiquetaDeRiesgo } from "@/lib/cobranza/presentacion";
import { formatCop } from "@/lib/format";
import { ClientRowActions, type CarteraOpcion, type Cliente } from "./client-dialog";

function nombreDe(cliente: Cliente): string {
  return `${cliente.nombre} ${cliente.apellido}`.trim();
}

function hrefDe(cliente: Cliente): string {
  return `/cobranza/carteras/${cliente.cartera_id}/clientes/${cliente.id}`;
}

/** Clientes de cobranza. `conCartera` para la búsqueda general; dentro de una cartera sobra. */
export function TablaDeClientes({
  clientes,
  carteras,
  conCartera = false,
  emptyTitle,
  emptyDescription,
}: {
  clientes: Cliente[];
  carteras: CarteraOpcion[];
  conCartera?: boolean;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const columns: Column<Cliente>[] = [
    {
      key: "cliente",
      header: "Cliente",
      cell: (c) => (
        <div className="flex flex-col">
          <span className="font-medium text-headline">{nombreDe(c)}</span>
          {c.negocio && <span className="text-xs text-text-soft">{c.negocio}</span>}
        </div>
      ),
    },
    ...(conCartera
      ? ([{ key: "cartera", header: "Cartera", cell: (c) => <span className="text-body">{c.cartera}</span> }] satisfies Column<Cliente>[])
      : []),
    { key: "telefono", header: "Teléfono", cell: (c) => <span className="whitespace-nowrap tabular-nums text-body">{c.telefono || "—"}</span> },
    {
      key: "documento",
      header: "Documento",
      className: "max-xl:hidden",
      cell: (c) => (
        <span className="whitespace-nowrap text-body">
          {c.numero_documento ? `${c.tipo_documento} ${c.numero_documento}`.trim() : "—"}
        </span>
      ),
    },
    {
      key: "tope",
      header: "Tope de deuda",
      align: "right",
      cell: (c) => (c.tope_maximo_deuda > 0 ? formatCop(c.tope_maximo_deuda) : "—"),
    },
    { key: "riesgo", header: "Riesgo", cell: (c) => <StatusBadge value={c.color_riesgo} map={RIESGO_STATUS} /> },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      className: "w-10",
      cell: (c) => (
        <div className="relative z-10 w-fit">
          <ClientRowActions cliente={c} carteras={carteras} />
        </div>
      ),
    },
  ];

  return (
    <TablaCobranza
      etiqueta="Clientes"
      columns={columns}
      rows={clientes}
      getRowKey={(c) => c.id}
      getRowHref={hrefDe}
      getRowLabel={(c) => `Abrir la ficha de ${nombreDe(c)}`}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      filaCelular={(c) => ({
        titulo: nombreDe(c),
        detalle: [conCartera ? c.cartera : c.telefono, etiquetaDeRiesgo(c.color_riesgo)].filter(Boolean).join(" · "),
        href: hrefDe(c),
        accion: <ClientRowActions cliente={c} carteras={carteras} />,
      })}
    />
  );
}
