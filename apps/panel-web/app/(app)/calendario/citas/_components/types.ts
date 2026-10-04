export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  kind: "appointment" | "block";
  status: string;
  source: "local" | "google";
  color: string;
  can_cancel: boolean;
  attendee_email: string;
  notes: string;
  appointment_type_id: string;
};

export type Tipo = { id: string; name: string; duration_minutes?: number | null };

export type Activity = {
  action: string;
  title: string;
  actor: string;
  old_start_at: string | null;
  new_start_at: string | null;
  created_at: string;
};
