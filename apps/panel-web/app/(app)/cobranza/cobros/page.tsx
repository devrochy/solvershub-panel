import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { ChargeForm } from "./_components/charge-form";
import { PaymentLinkDialog } from "./_components/payment-link-dialog";
import { ChargePayment } from "./_components/charge-payment";
import { apiFetch } from "@/lib/api/server";
import { formatCop, formatDate } from "@/lib/format";

export const metadata = { title: "Cobros al propietario" };

type OwnerCharge = {
  id: string;
  periodo: string;
  monto: number;
  pagado: number | null;
  vence: string;
  estado: string;
};

type PaymentLink = { referencia: string; url: string; monto: number; estado: string };
type OwnerCharges = { cobros: OwnerCharge[]; links: PaymentLink[] };

const CHARGE_TONE: Record<string, "success" | "warning" | "danger"> = {
  pagado: "success",
  pendiente: "warning",
  vencido: "danger",
};

export default async function CobrosPage() {
  const res = await apiFetch<OwnerCharges>("/pack/cobranza/owner-charges");
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar los cobros: {res.error}
      </p>
    );
  }
  const { cobros, links } = res.data;

  const chargeColumns: Column<OwnerCharge>[] = [
    { key: "periodo", header: "Periodo", cell: (c) => <span className="text-headline">{c.periodo}</span> },
    { key: "monto", header: "Monto", align: "right", cell: (c) => formatCop(c.monto) },
    {
      key: "pagado",
      header: "Pagado",
      align: "right",
      cell: (c) => (c.pagado === null ? "—" : formatCop(c.pagado)),
    },
    { key: "vence", header: "Vence", cell: (c) => formatDate(c.vence) },
    {
      key: "estado",
      header: "Estado",
      cell: (c) => <Badge variant={CHARGE_TONE[c.estado] ?? "neutral"}>{c.estado}</Badge>,
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (c) => (
        <div className="flex items-center justify-end gap-1">
          <ChargePayment chargeId={c.id} />
          <PaymentLinkDialog chargeId={c.id} />
        </div>
      ),
    },
  ];

  const linkColumns: Column<PaymentLink>[] = [
    {
      key: "referencia",
      header: "Referencia",
      cell: (l) => <span className="text-body font-mono text-xs">{l.referencia}</span>,
    },
    { key: "monto", header: "Monto", align: "right", cell: (l) => formatCop(l.monto) },
    {
      key: "estado",
      header: "Estado",
      cell: (l) => <Badge variant={l.estado === "pagado" ? "success" : "neutral"}>{l.estado}</Badge>,
    },
    {
      key: "url",
      header: "URL",
      cell: (l) => (
        <a href={l.url} className="text-link hover:underline" rel="noreferrer" target="_blank">
          Abrir ↗
        </a>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cobros al propietario"
        description="Períodos facturados al propietario (el tenant) y links de pago recientes."
      />

      <ChargeForm />

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-headline">Períodos</h2>
        <DataTable
          columns={chargeColumns}
          rows={cobros}
          getRowKey={(c) => c.id}
          emptyTitle="Sin períodos facturados"
          emptyDescription="Genera el cobro del período con el formulario de arriba."
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-headline">Links de pago</h2>
        <DataTable
          columns={linkColumns}
          rows={links}
          getRowKey={(l, i) => `${l.referencia}-${i}`}
          emptyTitle="Sin links de pago"
          emptyDescription="Los links que genere el cobro digital aparecerán aquí."
        />
      </section>
    </div>
  );
}
