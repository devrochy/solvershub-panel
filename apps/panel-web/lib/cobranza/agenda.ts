/** Agenda de promesas: agrupa por cuándo toca cobrar. Las fechas son días («2026-11-09»), sin hora. */

export type PromesaDeAgenda = {
  id: string;
  cliente: string;
  fecha_prometida: string;
  valor_prometido: number;
  estado: string;
  tipo: string;
  creado_por: string;
  alcance?: string | null;
};

export type GrupoDeAgenda = "vencidas" | "hoy" | "semana" | "despues";

export const TITULO_DE_GRUPO: Record<GrupoDeAgenda, string> = {
  vencidas: "Vencidas",
  hoy: "Hoy",
  semana: "Esta semana",
  despues: "Más adelante",
};

const DIA_MS = 86_400_000;

function diaUtc(iso: string): number {
  const [anio, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(anio, mes - 1, dia);
}

/** Días de `hoy` a `fecha`: negativo si ya pasó. */
export function diasHasta(fecha: string, hoy: string): number {
  return Math.round((diaUtc(fecha) - diaUtc(hoy)) / DIA_MS);
}

/** La fecha de hoy en la zona del negocio, no en la del servidor. */
export function fechaDeHoy(zona: string, ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
}

/** Días que le quedan a la semana de `hoy`, que termina el domingo. */
function diasParaDomingo(hoy: string): number {
  return (7 - new Date(diaUtc(hoy)).getUTCDay()) % 7;
}

function grupoDe(fecha: string, hoy: string): GrupoDeAgenda {
  const dias = diasHasta(fecha, hoy);
  if (dias < 0) return "vencidas";
  if (dias === 0) return "hoy";
  return dias <= diasParaDomingo(hoy) ? "semana" : "despues";
}

/** Pendientes por grupo, cada uno de la fecha más próxima a la más lejana, y las ya decididas aparte. */
export function agruparPromesas(promesas: PromesaDeAgenda[], hoy: string) {
  const grupos: Record<GrupoDeAgenda, PromesaDeAgenda[]> = { vencidas: [], hoy: [], semana: [], despues: [] };
  const decididas: PromesaDeAgenda[] = [];
  for (const promesa of promesas) {
    if (promesa.estado === "pendiente") grupos[grupoDe(promesa.fecha_prometida, hoy)].push(promesa);
    else decididas.push(promesa);
  }
  for (const grupo of Object.values(grupos)) grupo.sort((a, b) => a.fecha_prometida.localeCompare(b.fecha_prometida));
  return { grupos, decididas };
}

function conFormato(fecha: string, opciones: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("es-CO", { ...opciones, timeZone: "UTC" }).format(new Date(diaUtc(fecha)));
}

/** Cuándo, como se dice: «Hoy», «Hace 7 días», «Jueves 12», «3 de diciembre». */
export function cuandoEs(fecha: string, hoy: string): string {
  const dias = diasHasta(fecha, hoy);
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  if (dias === -1) return "Ayer";
  if (dias < 0) return `Hace ${-dias} días`;
  if (dias <= diasParaDomingo(hoy)) {
    const texto = conFormato(fecha, { weekday: "long", day: "numeric" }).replace(",", "");
    return `${texto[0].toUpperCase()}${texto.slice(1)}`;
  }
  return conFormato(fecha, { day: "numeric", month: "long" });
}
