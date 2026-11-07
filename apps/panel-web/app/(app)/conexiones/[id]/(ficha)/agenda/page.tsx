import Link from "next/link";

import { FormularioAgenda } from "@/app/(app)/calendario/_components/formulario-agenda";
import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
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
      descripcion="El nombre es el que el asistente le dice al cliente. La descripción y los alias le ayudan a recomendar esta agenda según lo que pide."
    >
      <Card>
        <CardContent className="pt-5">
          {agenda ? (
            <FormularioAgenda agenda={agenda} idBase="ficha" soloLectura={!puedeEditar} />
          ) : (
            <p className="text-sm text-body">
              Esta cuenta todavía no tiene una agenda. Se crea sola al reconectarla; también puedes abrir los ajustes de la{" "}
              <Link href="/calendario?ajustes=agendas" className="text-link underline-offset-2 hover:underline">
                Agenda
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>
    </SeccionFicha>
  );
}
