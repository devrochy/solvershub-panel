import type { Cron, CronEjecucion } from "@/lib/api/types";
import type { ConfirmOptions } from "@/components/ui/confirm";

/**
 * Gestión de crons de la plataforma (ADR-0183 de agent-core). Lógica pura: etiquetas, agrupación por
 * módulo, validación y descripción en español de la expresión, y los textos de confirmación.
 * Los horarios son de 5 campos y viajan en UTC; la pantalla los acompaña con la hora de Colombia.
 */

export type EstadoCron = Cron["estado"];
export type AccionCron = Cron["acciones"][number];
export type AccionDeBoton = Extract<AccionCron, "run" | "pause" | "resume">;

export const ESTADOS_CRON: EstadoCron[] = ["failing", "running", "ok", "paused", "never", "untracked"];

export const ESTADO_CRON_LABEL: Record<EstadoCron, string> = {
  ok: "Al día",
  running: "Ejecutando",
  failing: "Con fallo",
  paused: "Pausado",
  never: "Sin ejecutar",
  untracked: "Sin historial",
};

export const ACCION_LABEL: Record<AccionCron, string> = {
  run: "Ejecutar ahora",
  pause: "Pausar",
  resume: "Reanudar",
  schedule: "Reprogramar",
  reset_schedule: "Restaurar horario",
};

/** Texto de un cron que no guarda sus ejecuciones exitosas (en vez de «nunca»). */
export const SIN_EXITOS = "No se registran las ejecuciones exitosas de este cron; sí sus fallos y las manuales.";

const MOTIVO_DE_OMISION: Record<string, string> = {
  plugin_inactivo: "El pack está apagado en la plataforma",
  en_ejecucion: "Ya había una ejecución en curso",
};

export function motivoDeOmision(detail: string | null | undefined): string {
  if (!detail) return "—";
  return MOTIVO_DE_OMISION[detail] ?? detail;
}

export const DISPARADOR_LABEL: Record<CronEjecucion["trigger"], string> = {
  scheduled: "Programada",
  manual: "Manual",
};

/** Solo el master gestiona crons: un tester actúa como master en otras herramientas pero aquí no (ADR-0183). */
export function puedeOperarCrons(me: { role?: string | null } | null | undefined): boolean {
  return me?.role === "master";
}

// ----------------------------------------------------------------------------- listado y filtros
export type FiltrosCrons = { module?: string; estado?: string; q?: string };

export function consultaCrons(sp: FiltrosCrons): string {
  const qs = new URLSearchParams();
  if (sp.module) qs.set("module", sp.module);
  if (sp.estado && (ESTADOS_CRON as string[]).includes(sp.estado)) qs.set("estado", sp.estado);
  if (sp.q?.trim()) qs.set("q", sp.q.trim());
  const texto = qs.toString();
  return texto ? `?${texto}` : "";
}

export type GrupoDeCrons = { module: string; crons: Cron[] };

/** Un grupo por módulo, en el orden de la API, y los módulos que ya no existen al final. Sin grupos vacíos. */
export function agruparPorModulo(crons: Cron[], modulos: string[]): GrupoDeCrons[] {
  const grupos: GrupoDeCrons[] = [];
  const vistos = new Set<string>();
  for (const modulo of [...modulos, ...crons.map((c) => c.module)]) {
    if (vistos.has(modulo)) continue;
    vistos.add(modulo);
    const delModulo = crons.filter((c) => c.module === modulo);
    if (delModulo.length > 0) grupos.push({ module: modulo, crons: delModulo });
  }
  return grupos;
}

/** Cuántos del grupo tienen fallo / están pausados, para el encabezado del módulo. */
export function resumenDeGrupo(crons: Cron[]): { conFallo: number; pausados: number } {
  return {
    conFallo: crons.filter((c) => c.estado === "failing").length,
    pausados: crons.filter((c) => c.paused).length,
  };
}

// ----------------------------------------------------------------------------- expresiones cron
const RANGOS: [string, number, number][] = [
  ["minuto", 0, 59],
  ["hora", 0, 23],
  ["día del mes", 1, 31],
  ["mes", 1, 12],
  ["día de la semana", 0, 7],
];
const CAMPO = /^[0-9*/,-]+$/;
const ESPECIAL = /^\*\/(\d+)$/;

function valoresDeCampo(campo: string, min: number, max: number): number[] | null {
  const valores = new Set<number>();
  for (const parte of campo.split(",")) {
    if (parte === "") return null;
    const [rango, pasoTexto, ...resto] = parte.split("/");
    if (resto.length > 0) return null;
    const paso = pasoTexto === undefined ? 1 : Number(pasoTexto);
    if (!Number.isInteger(paso) || paso < 1) return null;
    let desde: number;
    let hasta: number;
    if (rango === "*") {
      [desde, hasta] = [min, max];
    } else if (/^\d+$/.test(rango)) {
      desde = hasta = Number(rango);
      if (pasoTexto !== undefined) hasta = max;
    } else if (/^\d+-\d+$/.test(rango)) {
      [desde, hasta] = rango.split("-").map(Number);
    } else {
      return null;
    }
    if (desde < min || hasta > max || desde > hasta) return null;
    for (let v = desde; v <= hasta; v += paso) valores.add(v);
  }
  return [...valores].sort((a, b) => a - b);
}

/** Normaliza los espacios. Devuelve el texto limpio de la expresión. */
export function normalizarCron(expresion: string): string {
  return expresion.trim().split(/\s+/).join(" ");
}

/**
 * Validación previa al envío (el servidor valida de nuevo y manda): 5 campos de cifras, `*`, `/`, `,` y `-`
 * dentro de su rango. Devuelve el mensaje de error o `null` si es válida.
 */
export function validarCron(expresion: string): string | null {
  const texto = normalizarCron(expresion);
  if (!texto) return "Escribe la expresión del horario.";
  const campos = texto.split(" ");
  if (campos.length !== 5) return "Deben ser 5 campos: minuto, hora, día del mes, mes y día de la semana.";
  for (let i = 0; i < 5; i++) {
    const [nombre, min, max] = RANGOS[i];
    if (!CAMPO.test(campos[i]) || valoresDeCampo(campos[i], min, max) === null) {
      return `El campo de ${nombre} no es válido (${min}–${max}; puedes usar *, /, , y -).`;
    }
  }
  return null;
}

const DOS = (n: number) => String(n).padStart(2, "0");
const HORA = (h: number, m: number) => `${DOS(h)}:${DOS(m)}`;
/** Colombia no usa horario de verano: siempre UTC−5. */
const A_COLOMBIA = (h: number, m: number) => HORA((h + 24 - 5) % 24, m);

/** En plural, como se dice en «los lunes»: lunes a viernes no cambian. */
const DIAS = ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"];

function unir(partes: string[]): string {
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

function textoDeDias(valores: number[]): string {
  // 7 también es domingo en cron.
  const dias = [...new Set(valores.map((v) => v % 7))].sort((a, b) => a - b);
  if (dias.length === 7) return "todos los días";
  if (dias.join() === "1,2,3,4,5") return "de lunes a viernes";
  if (dias.join() === "0,6") return "los fines de semana";
  return `los ${unir(dias.map((d) => DIAS[d]))}`;
}

/**
 * Describe el horario en español y con las horas de Colombia: «Todos los días a las 13:00 UTC (08:00 en
 * Colombia)». Cubre los patrones que usan los crons; el resto se muestra tal cual, como «Personalizado».
 */
export function describirCron(expresion: string | null | undefined, intervaloSegundos?: number | null): string {
  if (intervaloSegundos) return `Cada ${intervaloSegundos} segundos (intervalo fijo)`;
  if (!expresion) return "—";
  if (validarCron(expresion) !== null) return `Personalizado: ${expresion}`;
  const [m, h, dom, mes, dow] = normalizarCron(expresion).split(" ");
  const minutos = valoresDeCampo(m, 0, 59) ?? [];
  const horas = valoresDeCampo(h, 0, 23) ?? [];
  const diaTexto = dow === "*" ? "todos los días" : textoDeDias(valoresDeCampo(dow, 0, 7) ?? []);
  const soloDiario = dom === "*" && mes === "*";

  if (soloDiario && h === "*" && dow === "*") {
    if (m === "*") return "Cada minuto";
    const paso = ESPECIAL.exec(m);
    if (paso) return Number(paso[1]) === 1 ? "Cada minuto" : `Cada ${paso[1]} minutos`;
    if (minutos.length === 1) return `Cada hora, al minuto ${minutos[0]}`;
    return `Cada hora, en los minutos ${unir(minutos.map(String))}`;
  }
  if (soloDiario && minutos.length === 1 && h !== "*") {
    const minuto = minutos[0];
    // PLT-10: primero la hora de Colombia, que es la que se lee.
    const aLas = horas.map((hh) => `${A_COLOMBIA(hh, minuto)} en Colombia (${HORA(hh, minuto)} UTC)`);
    const prefijo = diaTexto === "todos los días" ? "Todos los días" : `${diaTexto[0].toUpperCase()}${diaTexto.slice(1)}`;
    return horas.length === 1 ? `${prefijo} a las ${aLas[0]}` : `${prefijo} a las ${unir(aLas)}`;
  }
  return `Personalizado: ${normalizarCron(expresion)}`;
}

/** Horarios frecuentes para no escribir la expresión a mano. */
export const PRESETS_CRON: { label: string; value: string }[] = [
  { label: "Cada 5 minutos", value: "*/5 * * * *" },
  { label: "Cada 15 minutos", value: "*/15 * * * *" },
  { label: "Cada 30 minutos", value: "*/30 * * * *" },
  { label: "Cada hora", value: "0 * * * *" },
  { label: "Todos los días a las 08:00 en Colombia", value: "0 13 * * *" },
  { label: "Todos los días a las 03:00 en Colombia", value: "0 8 * * *" },
  { label: "Lunes a viernes a las 08:00 en Colombia", value: "0 13 * * 1-5" },
];

// ----------------------------------------------------------------------------- textos de acción
export function confirmacionDeCron(accion: AccionDeBoton, cron: Pick<Cron, "label" | "sensitive" | "paused">): ConfirmOptions {
  const que = `«${cron.label}»`;
  switch (accion) {
    case "run":
      return {
        title: `¿Ejecutar ${que} ahora?`,
        description: cron.sensitive
          ? "Este cron cobra o escribe a clientes: se ejecutará una vez, de inmediato y para todos los negocios que le corresponden, aunque esté pausado. No se puede deshacer."
          : "Se ejecutará una vez, de inmediato y para todos los negocios que le corresponden, aunque esté pausado. El resultado aparece en el historial.",
        confirmLabel: "Ejecutar ahora",
        destructive: cron.sensitive,
      };
    case "pause":
      return {
        title: `¿Pausar ${que}?`,
        description: cron.sensitive
          ? "Dejará de ejecutarse hasta que lo reanudes. Mientras tanto no se harán los cobros o avisos que hace: nadie los recupera solo. Puedes ejecutarlo a mano si hace falta."
          : "Dejará de ejecutarse hasta que lo reanudes. Puedes ejecutarlo a mano mientras tanto.",
        confirmLabel: "Pausar",
        destructive: cron.sensitive,
      };
    case "resume":
      return {
        title: `¿Reanudar ${que}?`,
        description: "Vuelve a ejecutarse según su horario, a partir de la próxima hora programada.",
        confirmLabel: "Reanudar",
        destructive: false,
      };
  }
}

export function confirmacionDeHorario(cron: Pick<Cron, "label" | "sensitive">, nueva: string): ConfirmOptions | null {
  if (!cron.sensitive) return null;
  return {
    title: `¿Reprogramar «${cron.label}»?`,
    description: `Pasará a correr así: ${describirCron(nueva)}. Este cron cobra o escribe a clientes: un horario equivocado puede cobrar de más, avisar fuera de hora o no hacerlo. El beat lo aplica en menos de un minuto, sin reiniciar.`,
    confirmLabel: "Reprogramar",
    destructive: true,
  };
}

// ----------------------------------------------------------------------------- tiempos
/** 850 ms · 12,4 s · 3 min 5 s. */
export function formatDuracion(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  const segundos = ms / 1000;
  if (segundos < 60) return `${segundos.toLocaleString("es-CO", { maximumFractionDigits: 1 })} s`;
  const minutos = Math.floor(segundos / 60);
  return `${minutos} min ${Math.round(segundos - minutos * 60)} s`;
}

/** Cuánto falta (o hace) para una fecha, en español corto: «en 5 min», «hace 2 h». */
export function distanciaRelativa(iso: string | null | undefined, ahora: Date = new Date()): string {
  if (!iso) return "—";
  const dif = new Date(iso).getTime() - ahora.getTime();
  const futuro = dif >= 0;
  const segundos = Math.round(Math.abs(dif) / 1000);
  let cuerpo: string;
  if (segundos < 60) cuerpo = "unos segundos";
  else if (segundos < 3600) cuerpo = `${Math.round(segundos / 60)} min`;
  else if (segundos < 86400) cuerpo = `${Math.round(segundos / 3600)} h`;
  else cuerpo = `${Math.round(segundos / 86400)} d`;
  return futuro ? `en ${cuerpo}` : `hace ${cuerpo}`;
}

/** Margen antes de llamar «atrasado» a un cron: el planificador revisa cada minuto. */
const MARGEN_DE_ATRASO_MS = 5 * 60_000;

/**
 * Un cron atrasado (PLT-10): no está en pausa y su próxima ejecución ya pasó. Devuelve «8 d», «3 h»…
 * o `null` si va a tiempo.
 */
export function atraso(cron: Pick<Cron, "paused" | "next_run_at">, ahora: Date = new Date()): string | null {
  if (cron.paused || !cron.next_run_at) return null;
  const dif = ahora.getTime() - new Date(cron.next_run_at).getTime();
  if (dif <= MARGEN_DE_ATRASO_MS) return null;
  return distanciaRelativa(cron.next_run_at, ahora).replace(/^hace /, "");
}

/** «3 crons · 1 con fallo · 1 en pausa · 2 atrasados», sin los ceros. */
export function resumenDeCrons(crons: Cron[], ahora: Date = new Date()): string {
  const conFallo = crons.filter((c) => c.estado === "failing").length;
  const pausados = crons.filter((c) => c.paused).length;
  const atrasados = crons.filter((c) => atraso(c, ahora) !== null).length;
  const ejecutando = crons.filter((c) => c.estado === "running").length;
  return [
    `${crons.length} ${crons.length === 1 ? "cron" : "crons"}`,
    conFallo > 0 ? `${conFallo} con fallo` : null,
    pausados > 0 ? `${pausados} en pausa` : null,
    atrasados > 0 ? `${atrasados} ${atrasados === 1 ? "atrasado" : "atrasados"}` : null,
    ejecutando > 0 ? `${ejecutando} ejecutándose` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
