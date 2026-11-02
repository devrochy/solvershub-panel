/**
 * Franjas del horario de atención de Configuración › Identidad (`business_ranges`).
 *
 * El índice del día es el del backend (ADR-0051, `within_business_hours`): 0=lunes … 6=domingo,
 * el criterio de `datetime.weekday()` de Python. No es el de `Date.getDay()` de JS (0=domingo):
 * con ese, un horario cargado como «lunes» lo aplicaba el bot el martes.
 */
export const DIAS_FRANJA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

export type Franja = { day: number; from: string; to: string };

/** Leyenda de los índices: «0 Lun · 1 Mar · … · 6 Dom». */
export function leyendaDias(): string {
  return DIAS_FRANJA.map((dia, i) => `${i} ${dia}`).join(" · ");
}

/** Franjas a texto editable, una por línea: «día HH:MM-HH:MM». */
export function franjasATexto(ranges: Record<string, unknown>[]): string {
  return ranges.map((r) => `${r.day} ${r.from}-${r.to}`).join("\n");
}

/**
 * Texto editable a franjas. Las líneas que no tienen la forma «día HH:MM-HH:MM» no se guardan:
 * vuelven en `ignoradas` para avisarlo (las líneas en blanco no cuentan).
 */
export function analizarFranjas(text: string): { franjas: Franja[]; ignoradas: string[] } {
  const franjas: Franja[] = [];
  const ignoradas: string[] = [];
  for (const line of text.split("\n")) {
    const limpia = line.trim();
    if (!limpia) continue;
    const m = /^([0-6])\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/.exec(limpia);
    if (m) franjas.push({ day: Number(m[1]), from: m[2], to: m[3] });
    else ignoradas.push(limpia);
  }
  return { franjas, ignoradas };
}

/** Texto editable a franjas, sin las líneas que no tienen la forma «día HH:MM-HH:MM». */
export function textoAFranjas(text: string): Franja[] {
  return analizarFranjas(text).franjas;
}
