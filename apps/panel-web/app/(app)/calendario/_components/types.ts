import type { EventoAgenda } from "@/lib/calendario/agenda";

export type CalendarEvent = EventoAgenda;

/** Tipo de cita: `color` (`cat-1`…`cat-4`) y `codigo` desde HU-UX-08. */
export type Tipo = {
  id: string;
  name: string;
  duration_minutes?: number | null;
  color?: string;
  codigo?: string;
  active?: boolean;
};

export type Activity = {
  action: string;
  title: string;
  actor: string;
  old_start_at: string | null;
  new_start_at: string | null;
  created_at: string;
};
