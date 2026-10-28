/**
 * Datos del cliente que pide el agente (HU-CRM-13): lógica pura de la pestaña «Datos del cliente» de
 * Configuración. El dueño elige, por acción y por dato, si el agente lo pide sí o sí (requerido), si
 * lo pide cuando puede (recomendado) o si no lo pide. El backend (`/admin/datos-cliente/politica`)
 * guarda solo lo que difiere del valor del módulo; aquí se arma el estado editable, el cuerpo del PUT
 * y los textos legibles.
 */
import type { components } from "@/lib/api/schema";

export type PoliticaDatos = components["schemas"]["PoliticaDatosOut"];
export type AccionPolitica = components["schemas"]["AccionPoliticaOut"];
export type CampoPolitica = components["schemas"]["CampoPoliticaOut"];
export type NivelDato = CampoPolitica["nivel"];

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

/** Cuántos datos de la acción tienen cambios sin guardar. */
export function cambiosDeAccion(politica: PoliticaDatos, estado: EstadoDatos, accionId: string): number {
  const accion = politica.acciones.find((a) => a.id === accionId);
  return accion ? accion.campos.filter((c) => (estado[accionId]?.[c.clave] ?? c.nivel) !== c.nivel).length : 0;
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
