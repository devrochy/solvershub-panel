import {
  DeleteTypeButton,
  EditTypeDialog,
  NewTypeForm,
  type Responsable,
} from "@/app/(app)/calendario/tipos/_components/type-actions";
import { BinaryBadge } from "@/components/domain/status-badge";
import { EtiquetaDeTipo } from "@/components/domain/tipo-de-cita";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";

export const metadata = { title: "Tipos de cita" };

type Type = {
  id: string;
  name: string;
  duration_minutes: number;
  description: string;
  active: boolean;
  responsable_admin_id?: string | null;
  enlace_reunion?: string | null;
  color?: string;
  codigo?: string;
};

export default async function CalendarTypesPage() {
  const [res, colaboradoresRes] = await Promise.all([
    apiFetch<Type[]>("/pack/calendar/types"),
    apiFetch<{ id: string; email: string; active: boolean }[]>("/admin/collaborators"),
  ]);
  const responsables: Responsable[] = colaboradoresRes.ok
    ? colaboradoresRes.data.filter((c) => c.active).map((c) => ({ id: c.id, email: c.email }))
    : [];
  const emailDe = (id?: string | null) => responsables.find((r) => r.id === id)?.email;
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudieron cargar los tipos de cita: {res.error}
      </p>
    );
  }

  const columns: Column<Type>[] = [
    {
      key: "nombre",
      header: "Tipo",
      cell: (t) => <EtiquetaDeTipo tipo={{ name: t.name, color: t.color ?? "", codigo: t.codigo ?? "" }} />,
    },
    {
      key: "duracion",
      header: "Duración",
      align: "right",
      cell: (t) => <span className="text-body">{t.duration_minutes} min</span>,
    },
    {
      key: "desc",
      header: "Descripción",
      cell: (t) => <span className="text-body">{t.description || "—"}</span>,
    },
    {
      key: "responsable",
      header: "Responsable",
      cell: (t) => <span className="text-body">{emailDe(t.responsable_admin_id) ?? "Dueños"}</span>,
    },
    {
      key: "enlace",
      header: "Enlace",
      cell: (t) => <span className="text-body">{t.enlace_reunion ? "Propio" : "General"}</span>,
    },
    {
      key: "estado",
      header: "Estado",
      cell: (t) => <BinaryBadge active={t.active} activeLabel="Activo" inactiveLabel="Inactivo" />,
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (t) => (
        <div className="flex justify-end gap-1">
          <EditTypeDialog tipo={t} responsables={responsables} />
          <DeleteTypeButton typeId={t.id} label={t.name} />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tipos de cita"
        description="Servicios que el agente puede agendar. El color y el código distinguen sus citas en el calendario."
      />
      <NewTypeForm responsables={responsables} />
      <DataTable
        columns={columns}
        rows={res.data}
        getRowKey={(t) => t.id}
        emptyTitle="Sin tipos de cita"
        emptyDescription="Crea el primero (ej. Demo, Asesoría) para que el agente agende."
      />
    </div>
  );
}
