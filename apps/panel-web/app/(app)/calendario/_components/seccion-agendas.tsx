"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { MenuDeFila } from "@/components/domain/menu-de-fila";
import { MuestraDeColor } from "@/components/domain/tipo-de-cita";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { DropdownMenuItem, DropdownMenuLinkItem } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { AgendaCalendario, ListaDeAgendas } from "@/lib/api/types";

import { FormularioAgenda } from "./formulario-agenda";

/** Destino de «Conectar otra cuenta»: vuelve al cajón de Agendas con el aviso de Google. */
const CONECTAR_OTRA = `/api/calendar/oauth?next=${encodeURIComponent("/calendario?ajustes=agendas")}`;

/**
 * Agendas del negocio (HU-CAL-08): cada una tiene el nombre que el asistente le dice al
 * cliente. Una cuenta de Google es una agenda; para otro calendario se conecta otra cuenta.
 * Con 2 o más agendas el cliente elige con cuál quiere la cita (se puede apagar).
 */
export function SeccionAgendas({
  datos,
  bloqueado,
  puedeEscribir,
}: {
  datos: ListaDeAgendas;
  /** `?tenant=` pidió otro negocio: conectar guardaría la cuenta en el activo. */
  bloqueado: boolean;
  puedeEscribir: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<string | "nueva" | null>(null);
  const [modo, setModo] = useState(datos.multi_agenda_modo);
  const [estado, setEstado] = useState<{ error?: string; success?: string }>({});
  const activas = datos.calendars.filter((a) => a.active);

  async function cambiarModo(encendido: boolean) {
    const nuevo = encendido ? "cliente_elige" : "desactivado";
    const previo = modo;
    setModo(nuevo);
    setEstado({});
    const actual = await fetch("/api/plugins/pack_calendar").then((r) => r.json().catch(() => null));
    const res = await fetch("/api/plugins/pack_calendar", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: { ...((actual?.values as Record<string, unknown>) ?? {}), multi_agenda_modo: nuevo } }),
    });
    if (!res.ok) {
      setModo(previo);
      setEstado({ error: "No se pudo guardar el cambio." });
      return;
    }
    setEstado({ success: encendido ? "El cliente elige con quién." : "Todo va a la agenda principal." });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-body">
        Una agenda por persona o sala que atiende. Cada una tiene su disponibilidad y su color en el calendario.
      </p>
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border-soft bg-surface-2 p-4">
        <div className="flex flex-col gap-0.5">
          <label htmlFor="multi-agenda" className="text-sm font-medium text-headline">
            El cliente elige con quién
          </label>
          <p className="text-sm text-body">
            Tu agente le pregunta con quién quiere la cita y le dice quién tiene espacio a esa hora. Apagado, todo va a la
            agenda principal.
          </p>
          {activas.length < 2 && modo === "cliente_elige" && (
            <p className="text-sm text-text-soft">Se activa cuando haya al menos 2 agendas activas.</p>
          )}
        </div>
        <Switch
          id="multi-agenda"
          aria-label="El cliente elige con quién"
          checked={modo === "cliente_elige"}
          disabled={!puedeEscribir}
          onCheckedChange={(v) => void cambiarModo(v)}
        />
      </div>
      <FormFeedback error={estado.error} success={estado.success} />

      {datos.calendars.length === 0 ? (
        <EmptyState
          title="Todavía no hay agendas"
          description="Crea la agenda del negocio o conecta un Google Calendar, y tu agente empieza a agendar."
        />
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-lg border border-border-soft">
          {datos.calendars.map((a) => (
            <li key={a.id} className="border-t border-border-soft first:border-t-0">
              <FilaAgenda
                agenda={a}
                otras={datos.calendars.filter((o) => o.id !== a.id && o.active)}
                abierta={editando === a.id}
                puedeEscribir={puedeEscribir}
                onEditar={() => setEditando(editando === a.id ? null : a.id)}
              />
              {editando === a.id && (
                <div className="border-t border-border-soft p-3">
                  <FormularioAgenda
                    agenda={a}
                    idBase={`ag-${a.id}`}
                    soloLectura={!puedeEscribir}
                    onSaved={() => setEditando(null)}
                    onCancel={() => setEditando(null)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {puedeEscribir && (
        <div className="flex flex-wrap gap-2">
          {bloqueado ? (
            <Button variant="ghost" disabled>
              Conectar con Google
            </Button>
          ) : (
            <Button asChild variant="ghost">
              {/* `<a>` y no `<Link>`: el prefetch de Next llamaba al inicio del OAuth y renovaba el
                  `state` (HU-CAL-07). */}
              <a href={CONECTAR_OTRA}>Conectar con Google</a>
            </Button>
          )}
          <Button variant="outline" onClick={() => setEditando(editando === "nueva" ? null : "nueva")}>
            <Plus className="h-4 w-4" aria-hidden /> Agregar agenda
          </Button>
        </div>
      )}
      {editando === "nueva" && (
        <div className="rounded-lg border border-border-soft p-4">
          <FormularioAgenda idBase="ag-nueva" onSaved={() => setEditando(null)} onCancel={() => setEditando(null)} />
        </div>
      )}
    </div>
  );
}

function FilaAgenda({
  agenda,
  otras,
  abierta,
  puedeEscribir,
  onEditar,
}: {
  agenda: AgendaCalendario;
  otras: AgendaCalendario[];
  abierta: boolean;
  puedeEscribir: boolean;
  onEditar: () => void;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [moverA, setMoverA] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function eliminar(destino?: string) {
    const ok = await confirm({
      title: `Eliminar «${agenda.name}»`,
      description:
        agenda.source === "google"
          ? "Se quita la agenda del módulo. La cuenta de Google sigue conectada: se desconecta desde Conexiones."
          : "Se quita la agenda. Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/pack/calendar/calendars/${agenda.id}/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(destino ? { move_to: destino } : {}),
    });
    if (res.status === 409) {
      setMoverA(otras[0]?.id ?? "");
      setError("Tiene citas futuras: elige a qué agenda pasarlas para eliminarla.");
      return;
    }
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "No se pudo eliminar la agenda.");
      return;
    }
    router.refresh();
  }

  const origen =
    agenda.source === "google" ? `Conectada con Google${agenda.account_email ? ` · ${agenda.account_email}` : ""}` : "Agenda interna";

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center gap-3">
        <MuestraDeColor color={agenda.color} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-headline">
            {agenda.name}
            {agenda.is_default && <Badge variant="info">Principal</Badge>}
            {!agenda.active && <Badge variant="neutral">Inactiva</Badge>}
            {agenda.source === "google" && !agenda.connected && <Badge variant="warning">Sin conexión</Badge>}
          </p>
          <p className="truncate text-xs text-text-soft">
            {origen}
            {agenda.description ? ` · ${agenda.description}` : ""}
          </p>
        </div>
        <MenuDeFila etiqueta={`Más acciones de ${agenda.name}`} dentroDeUnCajon>
          <DropdownMenuItem icon={<Pencil />} onSelect={onEditar}>
            {abierta ? "Cerrar la edición" : puedeEscribir ? "Editar" : "Ver datos"}
          </DropdownMenuItem>
          {agenda.source === "google" && agenda.connection_id && (
            <DropdownMenuLinkItem href={`/conexiones/${agenda.connection_id}`}>
              Ver la conexión de Google
            </DropdownMenuLinkItem>
          )}
          {puedeEscribir && !agenda.is_default && (
            <DropdownMenuItem icon={<Trash2 />} tone="danger" onSelect={() => void eliminar()}>
              Eliminar
            </DropdownMenuItem>
          )}
        </MenuDeFila>
      </div>
      {error && (
        <p role="alert" className="text-sm text-status-danger-fg">
          {error}
        </p>
      )}
      {moverA !== null && otras.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Select aria-label="Pasar las citas a" value={moverA} onChange={(e) => setMoverA(e.target.value)} className="w-56">
            {otras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
          <Button variant="outline" onClick={() => void eliminar(moverA)}>
            Pasar las citas y eliminar
          </Button>
        </div>
      )}
    </div>
  );
}
