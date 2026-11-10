import Link from "next/link";

import { FormularioAgenda } from "@/app/(app)/calendario/_components/formulario-agenda";
import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/server";
import type { ListaDeAgendas, Me } from "@/lib/api/types";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";

export const metadata = { title: "Agenda" };

/** Agenda de la cuenta de Google (HU-CAL-08): la que el asistente le ofrece al cliente. */
export default async function AgendaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await fichaDePestana(id, "agenda");
  if (!ficha) return null;
  const [agendasRes, meRes] = await Promise.all([
    apiFetch<ListaDeAgendas>("/pack/calendar/calendars"),
    apiFetch<Me>("/admin/me"),
  ]);
  const agenda = agendasRes.ok ? agendasRes.data.calendars.find((a) => a.connection_id === id) : undefined;
  const puedeEditar = meRes.ok && meRes.data.permissions["pack_calendar:configuracion"] === "write";

  return (
    <SeccionFicha
      titulo="Agenda"
      descripcion="El nombre es el que tu agente le dice al cliente. La descripción y los alias le ayudan a recomendar esta agenda según lo que pide."
    >
      <Card>
        <CardContent className="pt-5">
          {agenda ? (
            <FormularioAgenda agenda={agenda} idBase="ficha" soloLectura={!puedeEditar} />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="font-display text-sh-block text-headline">Esta cuenta aún no tiene agenda</p>
                <p className="text-sm text-body">Se crea sola al reconectarla.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="accent">
                  {/* `<a>` y no `<Link>`: el inicio del OAuth no se pre-carga (HU-CAL-07). */}
                  <a href={`/api/calendar/oauth?connection_id=${id}&next=${encodeURIComponent(`/conexiones/${id}/agenda`)}`}>Reconectar</a>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/calendario?ajustes=agendas">Ajustes de la Agenda</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </SeccionFicha>
  );
}
