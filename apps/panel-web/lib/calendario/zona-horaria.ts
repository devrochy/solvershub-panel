import { createPlugin } from "@fullcalendar/core";
import { NamedTimeZoneImpl } from "@fullcalendar/core/internal";

/**
 * Zona horaria nombrada para FullCalendar con `Intl`, sin luxon ni moment (HU-UX-08).
 * Sin un `namedTimeZonedImpl`, FullCalendar trata `timeZone: "America/Bogota"` como UTC y
 * pinta las citas corridas (las 10:00 de Bogotá salían a las 15:00).
 *
 * FullCalendar trabaja con arreglos `[año, mes(0-11), día, hora, min, seg, ms]` que son la
 * hora de pared en la zona.
 */

const formatos = new Map<string, Intl.DateTimeFormat>();

function formato(zona: string): Intl.DateTimeFormat {
  let f = formatos.get(zona);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: zona,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formatos.set(zona, f);
  }
  return f;
}

/** Hora de pared en `zona` del instante `ms`, como arreglo de FullCalendar. */
export function horaDePared(zona: string, ms: number): number[] {
  const partes: Record<string, number> = {};
  for (const p of formato(zona).formatToParts(new Date(ms))) {
    if (p.type !== "literal") partes[p.type] = Number(p.value);
  }
  return [partes.year, partes.month - 1, partes.day, partes.hour % 24, partes.minute, partes.second, new Date(ms).getUTCMilliseconds()];
}

function comoUtc(a: number[]): number {
  return Date.UTC(a[0], a[1] ?? 0, a[2] ?? 1, a[3] ?? 0, a[4] ?? 0, a[5] ?? 0, a[6] ?? 0);
}

/** Minutos que `zona` le suma a UTC en el instante `ms` (Bogotá: -300). */
export function desfaseEn(zona: string, ms: number): number {
  return Math.round((comoUtc(horaDePared(zona, ms)) - ms) / 60000);
}

/** Desfase (minutos) de una hora de pared en `zona`. */
export function desfaseDeHoraDePared(zona: string, a: number[]): number {
  const local = comoUtc(a);
  const aprox = desfaseEn(zona, local);
  return desfaseEn(zona, local - aprox * 60000);
}

class ZonaIntl extends NamedTimeZoneImpl {
  offsetForArray(a: number[]): number {
    return desfaseDeHoraDePared(this.timeZoneName, a);
  }

  timestampToArray(ms: number): number[] {
    return horaDePared(this.timeZoneName, ms);
  }
}

export const zonaHorariaIntl = createPlugin({ name: "zona-horaria-intl", namedTimeZonedImpl: ZonaIntl });
