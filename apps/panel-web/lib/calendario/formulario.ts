/**
 * Día, hora y duración del formulario de una cita (AGE-06): horas en formato de Colombia
 * («4:00 p. m.») en lugar del selector del navegador, y el fin calculado con la duración.
 * Trabaja con la hora local del navegador, como el resto del panel de la Agenda.
 */

const FORMATO_HORA = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });

/** «16:00» → «4:00 p. m.». */
export function etiquetaDeHora(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return FORMATO_HORA.format(new Date(Date.UTC(2000, 0, 1, h, m)));
}

const dosCifras = (n: number) => String(n).padStart(2, "0");

/** Horas de `desde` a `hasta` (en horas) cada `paso` minutos; incluye `actual` si no cae en el paso. */
export function opcionesDeHora(paso = 15, desde = 6, hasta = 22, actual?: string): { value: string; label: string }[] {
  const valores = new Set<string>();
  for (let min = desde * 60; min <= hasta * 60; min += paso) valores.add(`${dosCifras(Math.floor(min / 60))}:${dosCifras(min % 60)}`);
  if (actual) valores.add(actual);
  return [...valores].sort().map((value) => ({ value, label: etiquetaDeHora(value) }));
}

export const DURACIONES = [15, 20, 30, 45, 60, 90, 120];

/** «90» → «1 h 30 min». */
export function etiquetaDeDuracion(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Duraciones para elegir; incluye la actual si no está en la lista. */
export function opcionesDeDuracion(actual?: number): number[] {
  return [...new Set([...DURACIONES, ...(actual ? [actual] : [])])].sort((a, b) => a - b);
}

/** ISO → día («AAAA-MM-DD») y hora («HH:MM») en la hora local del navegador. */
export function partesLocales(iso: string | undefined): { dia: string; hora: string } {
  const d = iso ? new Date(iso) : new Date();
  return {
    dia: `${d.getFullYear()}-${dosCifras(d.getMonth() + 1)}-${dosCifras(d.getDate())}`,
    hora: `${dosCifras(d.getHours())}:${dosCifras(d.getMinutes())}`,
  };
}

/** Minutos entre dos ISO (la duración de una cita existente). */
export function minutosEntre(inicio: string | undefined, fin: string | undefined): number | undefined {
  if (!inicio || !fin) return undefined;
  const min = Math.round((new Date(fin).getTime() - new Date(inicio).getTime()) / 60000);
  return min > 0 ? min : undefined;
}

/** Día y hora locales (+ minutos) → ISO para el backend. */
export function aIso(dia: string, hora: string, mas = 0): string {
  const d = new Date(`${dia}T${hora}:00`);
  return new Date(d.getTime() + mas * 60000).toISOString();
}

/** «2026-11-10» → «martes 10 de noviembre». */
export function diaLargo(dia: string): string {
  return new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${dia}T12:00:00Z`));
}
