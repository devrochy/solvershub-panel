import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";

import { CalendarGrid } from "./_components/calendar-grid";
import { type Tipo } from "./_components/types";

export const metadata = { title: "Citas" };

type Status = { timezone: string };

export default async function CitasPage() {
  const [tiposRes, statusRes] = await Promise.all([
    apiFetch<Tipo[]>("/pack/calendar/types"),
    apiFetch<Status>("/pack/calendar/status"),
  ]);
  const tipos = tiposRes.ok ? tiposRes.data : [];
  const timezone = statusRes.ok ? statusRes.data.timezone : "America/Bogota";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Citas"
        description="Agenda del negocio: arrastrá para mover, estirá para cambiar la duración, clic en un hueco para crear."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/calendario/bloqueos">Bloqueos</Link>
          </Button>
        }
      />
      <CalendarGrid tipos={tipos} timezone={timezone} />
    </div>
  );
}
