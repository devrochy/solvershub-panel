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

/** «Lun», «Lun y Mar», «Lun a Vie»: tramos de días seguidos; los salteados se separan con coma. */
function diasLegibles(dias: number[]): string {
  const ordenados = [...new Set(dias)].filter((d) => d >= 0 && d < DIAS_FRANJA.length).sort((a, b) => a - b);
  if (ordenados.length === DIAS_FRANJA.length) return "Todos los días";
  const tramos: number[][] = [];
  for (const dia of ordenados) {
    const ultimo = tramos[tramos.length - 1];
    if (ultimo && dia === ultimo[ultimo.length - 1] + 1) ultimo.push(dia);
    else tramos.push([dia]);
  }
  return tramos
    .map((t) =>
      t.length === 1
        ? DIAS_FRANJA[t[0]]
        : t.length === 2
          ? `${DIAS_FRANJA[t[0]]} y ${DIAS_FRANJA[t[1]]}`
          : `${DIAS_FRANJA[t[0]]} a ${DIAS_FRANJA[t[t.length - 1]]}`,
    )
    .join(", ");
}

/**
 * Franjas a una frase corta para leer, no para editar: los días con las mismas horas se juntan
 * («Lun a Vie 08:00–18:00; Sáb 09:00–13:00»). Sin franjas, «Siempre, sin horario». Entradas que no
 * tienen la forma de una franja se ignoran.
 */
export function franjasLegibles(ranges: unknown): string {
  const franjas = (Array.isArray(ranges) ? ranges : []).filter(
    (r): r is Franja =>
      !!r && typeof r === "object" && typeof (r as Franja).day === "number" && typeof (r as Franja).from === "string" && typeof (r as Franja).to === "string",
  );
  if (franjas.length === 0) return "Siempre, sin horario";
  const porHoras = new Map<string, number[]>();
  for (const { day, from, to } of franjas) {
    const clave = `${from}–${to}`;
    porHoras.set(clave, [...(porHoras.get(clave) ?? []), day]);
  }
  return [...porHoras].map(([horas, dias]) => `${diasLegibles(dias)} ${horas}`).join("; ");
}
