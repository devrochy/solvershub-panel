import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { apiFetch } from "@/lib/api/server";
import { DeviceCreateDialog } from "./_components/device-create-dialog";
import { DeviceStatus } from "./_components/device-status";

export const metadata = { title: "Dispositivos" };

type DeviceRow = {
  id: string;
  codigo: string;
  gestor: string;
  imei: string;
  whatsapp: string;
  estado: string;
  vinculado: string;
};

type AttemptRow = { resultado: string; motivo: string; imei: string; fecha: string };
type SyncRow = {
  fecha: string;
  tipo: string;
  estado: string;
  gestor: string;
  evento: string;
  critico: boolean;
};

type Devices = {
  pendientes: number;
  eventos_error: number;
  dispositivos: DeviceRow[];
  intentos: AttemptRow[];
  eventos: SyncRow[];
};

const DEVICE_TONE: Record<string, "success" | "warning" | "danger"> = {
  activo: "success",
  pendiente: "warning",
  bloqueado: "danger",
};

type Opcion = { id: string; nombre: string };

export default async function DispositivosPage() {
  const [res, gestoresRes, carterasRes] = await Promise.all([
    apiFetch<Devices>("/pack/cobranza/devices"),
    apiFetch<Opcion[]>("/pack/cobranza/collectors"),
    apiFetch<Opcion[]>("/pack/cobranza/portfolios"),
  ]);
  const gestores = gestoresRes.ok ? gestoresRes.data : [];
  const carteras = carterasRes.ok ? carterasRes.data : [];
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar los dispositivos: {res.error}
      </p>
    );
  }
  const { pendientes, eventos_error, dispositivos, intentos, eventos } = res.data;

  const deviceColumns: Column<DeviceRow>[] = [
    {
      key: "codigo",
      header: "Código",
      cell: (d) => <span className="text-body font-mono text-xs">{d.codigo.slice(0, 8)}</span>,
    },
    { key: "gestor", header: "Gestor", cell: (d) => <span className="text-headline">{d.gestor}</span> },
    {
      key: "estado",
      header: "Estado",
      cell: (d) => <Badge variant={DEVICE_TONE[d.estado] ?? "neutral"}>{d.estado}</Badge>,
    },
    { key: "imei", header: "IMEI", cell: (d) => <span className="text-body">{d.imei || "—"}</span> },
    { key: "whatsapp", header: "WhatsApp", cell: (d) => <span className="text-body">{d.whatsapp || "—"}</span> },
    {
      key: "vinculado",
      header: "Vinculado",
      cell: (d) => <span className="text-body">{d.vinculado || "—"}</span>,
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (d) => <DeviceStatus deviceId={d.id} estado={d.estado} />,
    },
  ];

  const attemptColumns: Column<AttemptRow>[] = [
    { key: "fecha", header: "Fecha", cell: (a) => <span className="text-body">{a.fecha || "—"}</span> },
    {
      key: "resultado",
      header: "Resultado",
      cell: (a) => <Badge variant={a.resultado === "ok" ? "success" : "danger"}>{a.resultado}</Badge>,
    },
    { key: "motivo", header: "Motivo", cell: (a) => <span className="text-body">{a.motivo || "—"}</span> },
    { key: "imei", header: "IMEI", cell: (a) => <span className="text-body">{a.imei || "—"}</span> },
  ];

  const syncColumns: Column<SyncRow>[] = [
    { key: "fecha", header: "Fecha", cell: (s) => <span className="text-body">{s.fecha || "—"}</span> },
    { key: "tipo", header: "Tipo", cell: (s) => <Badge variant="neutral">{s.tipo}</Badge> },
    { key: "gestor", header: "Gestor", cell: (s) => <span className="text-body">{s.gestor}</span> },
    {
      key: "estado",
      header: "Estado",
      cell: (s) => <Badge variant={s.critico ? "danger" : "success"}>{s.estado}</Badge>,
    },
    {
      key: "evento",
      header: "Evento",
      cell: (s) => <span className="text-body font-mono text-xs">{s.evento}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dispositivos"
        description="Equipos vinculados (ADR-0057), intentos de acceso y últimos eventos de sincronización."
        actions={<DeviceCreateDialog carteras={carteras} gestores={gestores} />}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Dispositivos" value={dispositivos.length} />
        <StatCard label="Pendientes de aprobar" value={pendientes} tone={pendientes > 0 ? "warning" : "default"} />
        <StatCard label="Eventos con error" value={eventos_error} tone={eventos_error > 0 ? "danger" : "default"} />
        <StatCard label="Intentos (últimos 20)" value={intentos.length} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-headline">Equipos</h2>
        <DataTable
          columns={deviceColumns}
          rows={dispositivos}
          getRowKey={(d) => d.id}
          emptyTitle="Sin dispositivos"
          emptyDescription="Genera un dispositivo desde el panel clásico o la app de campo; aquí se aprueba o bloquea."
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-headline">Eventos de sincronización</h2>
        <DataTable
          columns={syncColumns}
          rows={eventos}
          getRowKey={(s, i) => `${s.fecha}-${s.evento}-${i}`}
          emptyTitle="Sin eventos sincronizados"
          emptyDescription="Los eventos que envíe la app de campo aparecerán aquí."
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-headline">Intentos de acceso</h2>
        <DataTable
          columns={attemptColumns}
          rows={intentos}
          getRowKey={(a, i) => `${a.fecha}-${a.imei}-${i}`}
          emptyTitle="Sin intentos"
          emptyDescription="Los intentos de vinculación o cobro aparecerán aquí."
        />
      </section>
    </div>
  );
}
