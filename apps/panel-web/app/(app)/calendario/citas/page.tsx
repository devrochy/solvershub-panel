import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";

import { CalendarGrid } from "./_components/calendar-grid";
import { type Tipo } from "./_components/types";

export const metadata = { title: "Calendario" };

type Status = { timezone: string };

/** Portada de Agenda (HU-UX-08): la semana con citas por tipo y bloqueos. */
export default async function CitasPage() {
  const [tiposRes, statusRes] = await Promise.all([
    apiFetch<Tipo[]>("/pack/calendar/types"),
    apiFetch<Status>("/pack/calendar/status"),
  ]);
  const tipos = tiposRes.ok ? tiposRes.data.filter((t) => t.active !== false) : [];
  const timezone = statusRes.ok ? statusRes.data.timezone : "America/Bogota";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Calendario"
        description="Elige un hueco para crear una cita o un bloqueo. Arrastra para mover y estira para cambiar la duración."
      />
      <CalendarGrid tipos={tipos} timezone={timezone} />
    </div>
  );
}
