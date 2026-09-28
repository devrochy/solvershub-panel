import {
  DeleteTypeButton,
  NewTypeForm,
} from "@/app/(app)/calendario/tipos/_components/type-actions";
import { BinaryBadge } from "@/components/domain/status-badge";
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
};

export default async function CalendarTypesPage() {
  const res = await apiFetch<Type[]>("/pack/calendar/types");
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar los tipos de cita: {res.error}
      </p>
    );
  }

  const columns: Column<Type>[] = [
    { key: "nombre", header: "Tipo", cell: (t) => <span className="text-headline">{t.name}</span> },
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
      key: "estado",
      header: "Estado",
      cell: (t) => <BinaryBadge active={t.active} activeLabel="Activo" inactiveLabel="Inactivo" />,
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (t) => <DeleteTypeButton typeId={t.id} label={t.name} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tipos de cita"
        description="Servicios que el agente puede agendar, con su duración."
      />
      <NewTypeForm />
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
