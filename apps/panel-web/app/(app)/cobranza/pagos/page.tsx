import { ErrorDeCobranza } from "@/components/domain/cobranza/error-de-cobranza";
import { TablaCobranza } from "@/components/domain/cobranza/tabla-cobranza";
import { ListPage } from "@/components/templates/list-page";
import { type Column } from "@/components/ui/data-table";
import { apiFetch } from "@/lib/api/server";
import { metodoDePago } from "@/lib/cobranza/presentacion";
import { formatCop, formatDateTime } from "@/lib/format";

export const metadata = { title: "Pagos de clientes" };

type Payment = {
  id: string;
  cliente: string;
  valor: number;
  metodo_pago: string;
  registrado_por: string | null;
  fecha_hora: string;
};

export default async function CobrosPage() {
  const res = await apiFetch<Payment[]>("/pack/cobranza/payments");
  const header = { title: "Pagos de clientes", description: "Últimos pagos registrados por los gestores (hasta 100)." };
  if (!res.ok) {
    return (
      <ListPage header={header}>
        <ErrorDeCobranza titulo="No se pudieron cargar los pagos" detalle={res.error} />
      </ListPage>
    );
  }

  const columns: Column<Payment>[] = [
    { key: "cliente", header: "Cliente", cell: (p) => <span className="font-medium text-headline">{p.cliente}</span> },
    { key: "fecha", header: "Fecha", cell: (p) => <span className="whitespace-nowrap text-body">{formatDateTime(p.fecha_hora)}</span> },
    { key: "metodo", header: "Método", cell: (p) => <span className="text-body">{metodoDePago(p.metodo_pago)}</span> },
    { key: "registrado", header: "Registrado por", cell: (p) => <span className="text-body">{p.registrado_por ?? "—"}</span> },
    { key: "valor", header: "Valor", align: "right", cell: (p) => formatCop(p.valor) },
  ];

  return (
    <ListPage header={header}>
      <TablaCobranza
        etiqueta="Pagos"
        columns={columns}
        rows={res.data}
        getRowKey={(p) => p.id}
        emptyTitle="Sin cobros registrados"
        emptyDescription="Los pagos de la app de campo y del agente aparecerán aquí."
        filaCelular={(p) => ({
          titulo: p.cliente,
          detalle: `${formatDateTime(p.fecha_hora)} · ${metodoDePago(p.metodo_pago)}`,
          fin: formatCop(p.valor),
        })}
      />
    </ListPage>
  );
}
