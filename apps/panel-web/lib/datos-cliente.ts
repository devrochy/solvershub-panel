/**
 * Datos del cliente que pide cada agente especialista (HU-CRM-28): lógica pura del paso «Datos del
 * cliente» del editor. El dueño elige, por operación y por dato, si el agente lo pide sí o sí
 * (requerido), si lo pide cuando puede (recomendado) o si no lo pide. El backend
 * (`/admin/agents/{id}/datos-cliente`) guarda solo lo que difiere del valor del módulo; aquí se
 * arma el estado editable, el cuerpo del PUT y los textos legibles.
 */
import type { components } from "@/lib/api/schema";
import type { TipoDeNegocio } from "@/lib/onboarding";

export type MetodoEntrega = "domicilio" | "recoger_en_tienda";
export type AgenteDatos = components["schemas"]["AgenteDatosOut"];
export type ProcedimientoDatos = components["schemas"]["ProcedimientoDatosOut"];
export type PoliticaDatos = AgenteDatos;
export type AccionPolitica = components["schemas"]["AccionPoliticaOut"];
export type CampoPolitica = components["schemas"]["CampoPoliticaOut"];
export type NivelDato = CampoPolitica["nivel"];

/** Métodos de entrega que el agente puede ofrecer (HU-CRM-28). */
export const METODOS_ENTREGA: { id: MetodoEntrega; etiqueta: string; ayuda: string }[] = [
  { id: "domicilio", etiqueta: "A domicilio", ayuda: "El agente pide la dirección y lleva el pedido." },
  { id: "recoger_en_tienda", etiqueta: "Recoger en tienda", ayuda: "El cliente recoge el pedido en el negocio." },
];

/** Niveles que ve el dueño, en el orden en que se ofrecen. */
export const NIVELES: { id: NivelDato; etiqueta: string; ayuda: string }[] = [
  { id: "requerido", etiqueta: "Requerido", ayuda: "El agente no sigue sin este dato." },
  { id: "recomendado", etiqueta: "Recomendado", ayuda: "El agente lo pide, pero puede seguir sin él." },
  { id: "no_pedir", etiqueta: "No pedir", ayuda: "El agente no lo pide." },
];

const ETIQUETA_NIVEL = new Map(NIVELES.map((n) => [n.id, n.etiqueta]));

export function etiquetaNivel(nivel: NivelDato): string {
  return ETIQUETA_NIVEL.get(nivel) ?? nivel;
}

const NOMBRE_MODULO: Record<string, string> = {
  ventas: "Ventas",
  agenda: "Agenda",
  suscripciones: "Suscripciones",
  cobranza: "Cobranza",
};

/** Nombre legible del módulo; si llega uno nuevo, se muestra con la primera letra en mayúscula. */
export function nombreModulo(modulo: string): string {
  const conocido = NOMBRE_MODULO[modulo];
  if (conocido) return conocido;
  const limpio = modulo.replace(/[_-]+/g, " ").trim();
  return limpio ? limpio.charAt(0).toUpperCase() + limpio.slice(1) : "Otros";
}

/** Niveles elegidos: `{ acción: { dato: nivel } }`. */
export type EstadoDatos = Record<string, Record<string, NivelDato>>;

/** Lo que hoy tiene el negocio (con los ajustes ya aplicados). */
export function estadoInicial(politica: PoliticaDatos): EstadoDatos {
  const estado: EstadoDatos = {};
  for (const accion of politica.acciones) {
    estado[accion.id] = Object.fromEntries(accion.campos.map((c) => [c.clave, c.nivel]));
  }
  return estado;
}

/** Cambia el nivel de un dato; un dato que el sistema exige no se cambia. */
export function conNivel(
  politica: PoliticaDatos,
  estado: EstadoDatos,
  accionId: string,
  clave: string,
  nivel: NivelDato,
): EstadoDatos {
  const campo = politica.acciones.find((a) => a.id === accionId)?.campos.find((c) => c.clave === clave);
  if (!campo || !campo.ajustable) return estado;
  return { ...estado, [accionId]: { ...estado[accionId], [clave]: nivel } };
}

/** Deja una acción con los valores por defecto del módulo (lo que no se puede ajustar no cambia). */
export function restablecida(politica: PoliticaDatos, estado: EstadoDatos, accionId: string): EstadoDatos {
  const accion = politica.acciones.find((a) => a.id === accionId);
  if (!accion) return estado;
  const actual = estado[accionId] ?? {};
  return {
    ...estado,
    [accionId]: Object.fromEntries(
      accion.campos.map((c) => [c.clave, c.ajustable ? c.por_defecto : (actual[c.clave] ?? c.nivel)]),
    ),
  };
}

/** ¿Algún dato de la acción está distinto de su valor por defecto? (habilita «Restablecer»). */
export function estaAjustada(politica: PoliticaDatos, estado: EstadoDatos, accionId: string): boolean {
  const accion = politica.acciones.find((a) => a.id === accionId);
  return Boolean(
    accion?.campos.some((c) => c.ajustable && (estado[accionId]?.[c.clave] ?? c.nivel) !== c.por_defecto),
  );
}

/** ¿Hay cambios sin guardar respecto a lo que trajo el servidor? */
export function hayCambios(politica: PoliticaDatos, estado: EstadoDatos): boolean {
  return politica.acciones.some((a) => a.campos.some((c) => (estado[a.id]?.[c.clave] ?? c.nivel) !== c.nivel));
}

/** Cuántos datos de la acción tienen cambios sin guardar; `guardado` es la última versión guardada. */
export function cambiosDeAccion(
  politica: PoliticaDatos,
  estado: EstadoDatos,
  accionId: string,
  guardado?: EstadoDatos,
): number {
  const accion = politica.acciones.find((a) => a.id === accionId);
  if (!accion) return 0;
  return accion.campos.filter((c) => {
    const actual = estado[accionId]?.[c.clave] ?? c.nivel;
    const base = guardado?.[accionId]?.[c.clave] ?? c.nivel;
    return actual !== base;
  }).length;
}

/**
 * Cuerpo del PUT: el estado completo de todas las acciones, porque el backend reemplaza los ajustes
 * de las acciones habilitadas. Solo van los datos ajustables que difieren del valor por defecto; una
 * acción en valores por defecto va vacía (así «Restablecer» borra sus ajustes) y los datos que exige
 * el sistema nunca se envían (el backend los rechaza con 422).
 */
export function cuerpoParaGuardar(
  politica: PoliticaDatos,
  estado: EstadoDatos,
): { politica: Record<string, Record<string, NivelDato>> } {
  const salida: Record<string, Record<string, NivelDato>> = {};
  for (const accion of politica.acciones) {
    const ajustes: Record<string, NivelDato> = {};
    for (const campo of accion.campos) {
      if (!campo.ajustable) continue;
      const nivel = estado[accion.id]?.[campo.clave] ?? campo.nivel;
      if (nivel !== campo.por_defecto) ajustes[campo.clave] = nivel;
    }
    salida[accion.id] = ajustes;
  }
  return { politica: salida };
}

export interface GrupoDeModulo {
  modulo: string;
  nombre: string;
  acciones: AccionPolitica[];
}

/** Agrupa las acciones por módulo, en el orden en que llegan. */
export function agruparPorModulo(acciones: AccionPolitica[]): GrupoDeModulo[] {
  const grupos = new Map<string, GrupoDeModulo>();
  for (const accion of acciones) {
    const grupo = grupos.get(accion.modulo) ?? { modulo: accion.modulo, nombre: nombreModulo(accion.modulo), acciones: [] };
    grupo.acciones.push(accion);
    grupos.set(accion.modulo, grupo);
  }
  return [...grupos.values()];
}

/** Pista bajo un dato: solo cuando lo elegido difiere del valor por defecto. */
export function pistaDePorDefecto(campo: CampoPolitica, nivelActual: NivelDato): string | null {
  return nivelActual === campo.por_defecto ? null : `Por defecto: ${etiquetaNivel(campo.por_defecto)}.`;
}

/**
 * ¿Puede guardar? Master, o quien tenga la sección Configuración en escritura (el backend exige
 * `settings`). Quien solo puede ver recibe la pestaña sin botones de guardado.
 */
export function puedeEditarDatosCliente(
  me: { role?: string | null; permissions?: Record<string, string | null | undefined> | null } | null | undefined,
): boolean {
  if (!me) return false;
  return me.role === "master" || me.permissions?.settings === "write";
}

// ------------------------------------------------------------------ «Cuánto pregunta» (HU-AOS-85)

/**
 * Los tres niveles de «Cuánto pregunta» (SPEC-49, estación 3). «Lo justo» es exactamente el
 * `por_defecto` de cada dato: es lo que se marca «Recomendado» (la etiqueta, que no es el nivel
 * `recomendado` de un dato). «Lo mínimo» deja solo lo que exige el sistema y lo requerido por defecto;
 * «Completo» pide como requerido todo lo ajustable. Los datos con piso técnico (`ajustable=false`)
 * no cambian en ninguno.
 */
export type CuantoPregunta = "minimo" | "justo" | "completo";

export const CUANTO_PREGUNTA: { id: CuantoPregunta; titulo: string }[] = [
  { id: "minimo", titulo: "Lo mínimo" },
  { id: "justo", titulo: "Lo justo" },
  { id: "completo", titulo: "Completo" },
];

/** El nivel de «Cuánto pregunta» que se recomienda (el `por_defecto`). */
export const CUANTO_PREGUNTA_RECOMENDADO: CuantoPregunta = "justo";

function nivelEnPreset(campo: CampoPolitica, preset: CuantoPregunta, actual: NivelDato): NivelDato {
  if (!campo.ajustable) return actual;
  if (preset === "justo") return campo.por_defecto;
  if (preset === "completo") return "requerido";
  return campo.por_defecto === "requerido" ? "requerido" : "no_pedir";
}

/** El estado con todos los datos en el nivel de «Cuánto pregunta»; los pisos técnicos quedan como están. */
export function conCuantoPregunta(politica: PoliticaDatos, estado: EstadoDatos, preset: CuantoPregunta): EstadoDatos {
  const salida: EstadoDatos = { ...estado };
  for (const accion of politica.acciones) {
    const actual = estado[accion.id] ?? {};
    salida[accion.id] = Object.fromEntries(
      accion.campos.map((c) => [c.clave, nivelEnPreset(c, preset, actual[c.clave] ?? c.nivel)]),
    );
  }
  return salida;
}

/** «Usar lo recomendado»: todos los datos ajustables vuelven a su `por_defecto`. */
export function alPorDefecto(politica: PoliticaDatos, estado: EstadoDatos): EstadoDatos {
  return conCuantoPregunta(politica, estado, "justo");
}

function mismoEstado(politica: PoliticaDatos, a: EstadoDatos, b: EstadoDatos): boolean {
  return politica.acciones.every((accion) =>
    accion.campos.every((c) => (a[accion.id]?.[c.clave] ?? c.nivel) === (b[accion.id]?.[c.clave] ?? c.nivel)),
  );
}

/**
 * Los niveles que se ofrecen: si un nivel deja todo igual que «Lo justo» (un agente sin datos que
 * los separen), no se muestra. «Lo justo» siempre está.
 */
export function opcionesDeCuantoPregunta(politica: PoliticaDatos): CuantoPregunta[] {
  const base = estadoInicial(politica);
  const justo = conCuantoPregunta(politica, base, "justo");
  return CUANTO_PREGUNTA.map((p) => p.id).filter(
    (id) => id === "justo" || !mismoEstado(politica, conCuantoPregunta(politica, base, id), justo),
  );
}

/** El nivel de «Cuánto pregunta» que coincide dato por dato con el estado, o `null` si es a medida. */
export function cuantoPreguntaActual(politica: PoliticaDatos, estado: EstadoDatos): CuantoPregunta | null {
  // «Lo justo» primero: si dos niveles coinciden, gana el recomendado.
  const orden: CuantoPregunta[] = ["justo", "minimo", "completo"];
  const ofrecidos = new Set(opcionesDeCuantoPregunta(politica));
  return (
    orden.find((id) => ofrecidos.has(id) && mismoEstado(politica, estado, conCuantoPregunta(politica, estado, id))) ?? null
  );
}

/** Cuántos datos ajustables están distintos de su `por_defecto` (la barra «N cambios»). */
export function cambiosFrenteAPorDefecto(politica: PoliticaDatos, estado: EstadoDatos): number {
  return politica.acciones.reduce(
    (total, accion) =>
      total + accion.campos.filter((c) => c.ajustable && (estado[accion.id]?.[c.clave] ?? c.nivel) !== c.por_defecto).length,
    0,
  );
}

/**
 * Qué pide en ese nivel, en palabras: «Pide nombre y teléfono». Los datos se nombran una vez aunque
 * estén en varias operaciones; con más de tres, «y N más».
 */
export function resumenDeCuantoPregunta(politica: PoliticaDatos, preset: CuantoPregunta): string {
  const estado = conCuantoPregunta(politica, estadoInicial(politica), preset);
  const etiquetas: string[] = [];
  for (const accion of politica.acciones) {
    for (const campo of accion.campos) {
      if ((estado[accion.id]?.[campo.clave] ?? campo.nivel) === "no_pedir") continue;
      const etiqueta = campo.etiqueta.trim();
      if (etiqueta && !etiquetas.some((e) => e.toLocaleLowerCase("es-CO") === etiqueta.toLocaleLowerCase("es-CO"))) {
        etiquetas.push(etiqueta);
      }
    }
  }
  if (etiquetas.length === 0) return "No pide datos.";
  const nombres = etiquetas.slice(0, 3).map(enMinuscula);
  const resto = etiquetas.length - nombres.length;
  if (resto > 0) return `Pide ${nombres.join(", ")} y ${resto} más.`;
  if (nombres.length === 1) return `Pide ${nombres[0]}.`;
  return `Pide ${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}.`;
}

function enMinuscula(texto: string): string {
  return texto.charAt(0).toLocaleLowerCase("es-CO") + texto.slice(1);
}

/** La pista de un dato que el sistema exige: «Necesario para agendar una cita». */
export function pistaDePiso(accion: Pick<AccionPolitica, "etiqueta">): string {
  const etiqueta = accion.etiqueta.trim();
  if (!etiqueta) return "Necesario para esta operación.";
  return `Necesario para ${enMinuscula(etiqueta)}.`;
}

const TIPOS: readonly TipoDeNegocio[] = ["ventas", "agenda", "cobranza", "suscripciones"];

/**
 * El tipo de agente para el chat simulado del paso (D-SPEC-49-4): su `key` si es un tipo conocido; si
 * no, el módulo de su primera operación. `null` si no hay cómo saberlo (sin chat de pruebas).
 */
export function tipoDelAgente(key: string | null | undefined, politica: PoliticaDatos | null): TipoDeNegocio | null {
  const porKey = TIPOS.find((t) => t === key);
  if (porKey) return porKey;
  const modulo = politica?.acciones.map((a) => a.modulo).find((m) => (TIPOS as readonly string[]).includes(m));
  return (modulo as TipoDeNegocio | undefined) ?? null;
}

/** Mensaje claro para un error del backend al guardar. */
export function mensajeDeErrorAlGuardar(status: number | undefined, error?: string): string {
  if (status === 403) return "No tienes permiso para cambiar esto. Pídele acceso a quien administra el negocio.";
  if (status === 422) {
    return error && error.trim()
      ? error
      : "Alguno de esos datos ya no se puede ajustar. Recarga la página e inténtalo de nuevo.";
  }
  return error && error.trim() ? error : "No se pudieron guardar los datos del cliente.";
}
