"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { MuestraDeColor } from "@/components/domain/tipo-de-cita";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/empty-state";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { AgendaCalendario, ListaDeAgendas } from "@/lib/api/types";
import { inicialDeAgenda } from "@/lib/calendario/agenda";

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
    setEstado({ success: encendido ? "El cliente elige la agenda." : "Se agenda siempre en la agenda principal." });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
        <div className="flex flex-col gap-0.5">
          <label htmlFor="multi-agenda" className="text-sm font-medium text-headline">
            El cliente elige la agenda
          </label>
          <p className="text-sm text-body">
            Con 2 o más agendas el asistente pregunta con quién quiere la cita, informa la disponibilidad de cada una a la hora
            deseada y recomienda según lo que pide el cliente. Apagado, agenda siempre en la principal.
          </p>
          {activas.length < 2 && modo === "cliente_elige" && (
            <p className="text-sm text-text-soft">Se activa cuando haya al menos 2 agendas activas.</p>
          )}
        </div>
        <Switch
          id="multi-agenda"
          aria-label="El cliente elige la agenda"
          checked={modo === "cliente_elige"}
          disabled={!puedeEscribir}
          onCheckedChange={(v) => void cambiarModo(v)}
        />
      </div>
      <FormFeedback error={estado.error} success={estado.success} />

      {datos.calendars.length === 0 ? (
        <EmptyState
          title="Aún no hay agendas"
          description="Conecta una cuenta de Google Calendar o crea una agenda interna para empezar."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {datos.calendars.map((a) => (
            <li key={a.id} className="rounded-md border border-border">
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
            <Button variant="outline" size="sm" disabled>
              Conectar otra cuenta de Google ↗
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              {/* `<a>` y no `<Link>`: el prefetch de Next llamaba al inicio del OAuth y renovaba el
                  `state` (HU-CAL-07). */}
              <a href={CONECTAR_OTRA}>Conectar otra cuenta de Google ↗</a>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setEditando(editando === "nueva" ? null : "nueva")}>
            <Plus className="h-4 w-4" aria-hidden /> Agregar agenda interna
          </Button>
        </div>
      )}
      {editando === "nueva" && (
        <div className="rounded-md border border-border p-3">
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

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center gap-0.5 rounded-full text-xs font-semibold text-headline ring-1 ring-border"
        >
          <MuestraDeColor color={agenda.color} className="h-2 w-2" />
          {inicialDeAgenda(agenda.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-headline">{agenda.name}</p>
          <p className="truncate text-xs text-body">
            {agenda.source === "google" ? agenda.account_email || "Google Calendar" : "Agenda interna"}
            {agenda.description ? ` · ${agenda.description}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          {agenda.is_default && <Badge variant="accent">Principal</Badge>}
          {!agenda.active && <Badge variant="neutral">Inactiva</Badge>}
          {agenda.source === "google" && !agenda.connected && <Badge variant="warning">Sin conexión</Badge>}
          <Button
            aria-label={`${abierta ? "Cerrar" : "Editar"} ${agenda.name}`}
            title={`Editar ${agenda.name}`}
            size="icon"
            variant="ghost"
            onClick={onEditar}
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
          {puedeEscribir && !agenda.is_default && (
            <Button
              aria-label={`Eliminar ${agenda.name}`}
              title={`Eliminar ${agenda.name}`}
              size="icon"
              variant="ghost"
              onClick={() => void eliminar()}
            >
              <Trash2 className="h-4 w-4 text-status-danger-fg" aria-hidden />
            </Button>
          )}
        </div>
      </div>
      {agenda.source === "google" && agenda.connection_id && (
        <Link href={`/conexiones/${agenda.connection_id}`} className="text-xs text-link underline-offset-2 hover:underline">
          Ver la conexión de Google
        </Link>
      )}
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
          <Button size="sm" variant="outline" onClick={() => void eliminar(moverA)}>
            Pasar las citas y eliminar
          </Button>
        </div>
      )}
    </div>
  );
}
