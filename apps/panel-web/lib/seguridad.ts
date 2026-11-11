import type { components } from "@/lib/api/schema";
import type { Me } from "@/lib/api/types";
import { distanciaRelativa } from "@/lib/crons";
import { diaEnPalabras } from "@/lib/plataforma";

/**
 * Reglas de la sección Seguridad (HU-ACC-04, ADR-0174): dispositivos de las cuentas, política
 * por rol y alertas de acceso. Lógica pura: las páginas y sus piezas solo la usan. Espejo de
 * `core/access/devices.py`: lo que la API rechaza por permiso o por estado, aquí no se ofrece
 * ("nunca un 403 por diseño"); lo que depende de otra petición (estado desactualizado) lo
 * explica el diálogo.
 */

export type DispositivoAcceso = components["schemas"]["AccessDeviceOut"];
export type EventoAcceso = components["schemas"]["AccessEventOut"];
export type PoliticaAcceso = components["schemas"]["AccessPolicyOut"];
export type PaginaDeDispositivos = components["schemas"]["AccessDevicePage"];
export type PaginaDeEventos = components["schemas"]["AccessEventPage"];

export type EstadoDispositivo = DispositivoAcceso["estado"];
export type ValorPolitica = PoliticaAcceso["owner"];
export type RolPolitica = keyof PoliticaAcceso;
export type SeveridadEvento = EventoAcceso["severidad"];
export type TipoEvento = EventoAcceso["tipo"];

export type Tono = "neutral" | "info" | "success" | "warning" | "danger";

export const ESTADO_DISPOSITIVO: Record<EstadoDispositivo, { label: string; tone: Tono }> = {
  pendiente: { label: "Espera aprobación", tone: "warning" },
  activo: { label: "Activo", tone: "success" },
  bloqueado: { label: "Bloqueado", tone: "danger" },
};

export const ESTADOS: EstadoDispositivo[] = ["pendiente", "activo", "bloqueado"];

const ROL_DE_ACCESO: Record<string, string> = {
  owner: "Dueño",
  colaborador: "Colaborador",
  gestor: "Gestor",
  master: "Administrador de plataforma",
};

/** Rol con el que la cuenta se registró (el gestor es colaborador en el core): «Gestor», «Dueño»… */
export function rolDelDispositivo(d: Pick<DispositivoAcceso, "rol_al_registrar" | "cuenta">): string {
  const clave = d.rol_al_registrar ?? d.cuenta?.rol ?? "";
  return ROL_DE_ACCESO[clave] ?? "—";
}

export const ROLES_POLITICA: { clave: RolPolitica; label: string; detalle: string }[] = [
  { clave: "owner", label: "Dueño", detalle: "Quien administra el negocio." },
  { clave: "colaborador", label: "Colaborador", detalle: "Personas del equipo con acceso al panel." },
  { clave: "gestor", label: "Gestor", detalle: "Cuentas de campo de Cobranza." },
];

export const VALOR_POLITICA: Record<ValorPolitica, { label: string; explicacion: string }> = {
  abierto: {
    label: "Sin aprobación",
    explicacion: "El primer equipo de cada persona entra de una vez; verás el aviso en la actividad de Seguridad.",
  },
  restringido: {
    label: "Con aprobación",
    explicacion: "Un equipo nuevo espera tu aprobación; mientras tanto no puede entrar a la app.",
  },
};

/** El límite real de esta política, que la UI debe decir (ADR-0174 §8). */
export const LIMITE_DE_LA_POLITICA =
  "En la app esto frena a quien no tenga tu aprobación; no impide entrar por el panel web. Para dueño y colaborador es una medida de higiene (teléfono perdido o compartido), no una barrera.";

/** Aviso al dejar al dueño en «Restringido»: la app vigente no tiene flujo de vinculación para él. */
export const AVISO_DUENO_RESTRINGIDO =
  "La app instalada hoy no tiene pantalla para que un dueño vincule un equipo nuevo: con aprobación, un equipo nuevo del dueño queda pendiente y su sesión en la app se cierra hasta que otro dueño lo apruebe aquí.";

export const TIPO_EVENTO: Record<TipoEvento, string> = {
  login_fallido: "Intento de acceso fallido",
  login_bloqueado: "Acceso bloqueado por intentos",
  dispositivo_nuevo: "Equipo nuevo",
  dispositivo_pendiente: "Equipo pendiente de aprobación",
  dispositivo_aprobado: "Equipo aprobado",
  dispositivo_bloqueado_usado: "Equipo bloqueado intentó entrar",
  acceso_denegado_politica: "Acceso denegado por la política",
  dispositivo_sin_id: "Equipo sin identificador",
  dispositivo_compartido: "Equipo usado por varias cuentas",
  politica_cambiada: "Política cambiada",
  acceso_master: "Acceso del administrador de plataforma",
  legado_pack: "Intento del registro anterior",
};

export const TIPOS_DE_EVENTO = Object.keys(TIPO_EVENTO) as TipoEvento[];

export const SEVERIDAD: Record<SeveridadEvento, { label: string; tone: Tono }> = {
  info: { label: "Informativa", tone: "neutral" },
  aviso: { label: "Aviso", tone: "warning" },
  critico: { label: "Crítica", tone: "danger" },
};

export const SEVERIDADES: SeveridadEvento[] = ["info", "aviso", "critico"];

export const CANAL: Record<EventoAcceso["canal"], string> = {
  campo: "App de campo",
  panel_apk: "App móvil",
  campo_v1: "App de campo (anterior)",
};

export type AccionDispositivo = "aprobar" | "reactivar" | "bloquear" | "dar_de_baja";

export type ContextoDeAcciones = {
  /** Tiene `devices` en escritura. */
  puedeEscribir: boolean;
  /** Dueño del negocio o administrador de plataforma. */
  esDuenoOMaster: boolean;
  /** Cuenta que mira la lista: no puede aprobar ni reactivar su propio equipo. */
  miAdminId: string | null;
};

/** El tester actúa como dueño de su negocio de pruebas (misma regla que Colaboradores). */
export function contextoDeAcciones(me: Me | null): ContextoDeAcciones {
  if (!me) return { puedeEscribir: false, esDuenoOMaster: false, miAdminId: null };
  const esMaster = me.role === "master";
  const esDuenoOMaster = esMaster || me.role === "tester" || me.tenant?.role === "owner";
  return {
    puedeEscribir: esDuenoOMaster || me.permissions?.devices === "write",
    esDuenoOMaster,
    miAdminId: me.admin_id,
  };
}

/**
 * Acciones que la API acepta sobre esta fila para quien mira:
 * - pendiente: aprobar y dar de baja; activo: bloquear y dar de baja; bloqueado: reactivar y nada más
 *   (dar de baja un bloqueado haría desaparecer el bloqueo con la política abierta);
 * - los equipos de un dueño solo los gestiona un dueño o el master;
 * - nadie aprueba ni reactiva su propio equipo.
 */
export function accionesDeDispositivo(d: DispositivoAcceso, ctx: ContextoDeAcciones): AccionDispositivo[] {
  if (!ctx.puedeEscribir) return [];
  if (d.cuenta?.rol === "owner" && !ctx.esDuenoOMaster) return [];
  const propio = ctx.miAdminId !== null && d.cuenta?.id === ctx.miAdminId;
  switch (d.estado) {
    case "pendiente":
      return propio ? ["dar_de_baja"] : ["aprobar", "dar_de_baja"];
    case "activo":
      return ["bloquear", "dar_de_baja"];
    case "bloqueado":
      return propio ? [] : ["reactivar"];
  }
}

/** Cuerpo del POST de cada acción; `esperado` es el estado que el usuario veía (409 si cambió). */
export function cuerpoDeAccion(
  accion: AccionDispositivo,
  d: Pick<DispositivoAcceso, "estado">,
  extra: { motivo?: string; alcance?: "cuenta" | "equipo" } = {},
): Record<string, unknown> {
  switch (accion) {
    case "aprobar":
    case "reactivar":
      return { esperado: d.estado };
    case "bloquear":
      return {
        esperado: d.estado,
        alcance: extra.alcance ?? "cuenta",
        ...(extra.motivo?.trim() ? { motivo: extra.motivo.trim() } : {}),
      };
    case "dar_de_baja":
      return { esperado: d.estado };
  }
}

export const RUTA_DE_ACCION: Record<AccionDispositivo, string> = {
  aprobar: "aprobar",
  reactivar: "aprobar",
  bloquear: "bloquear",
  dar_de_baja: "dar-de-baja",
};

export const ETIQUETA_DE_ACCION: Record<AccionDispositivo, string> = {
  aprobar: "Aprobar equipo",
  reactivar: "Reactivar equipo",
  bloquear: "Bloquear equipo",
  dar_de_baja: "Dar de baja",
};

/** Qué pasó con una acción rechazada, en una frase que dice cómo seguir. */
export function mensajeDeAccionRechazada(status: number, code: string | undefined, mensaje: string | undefined): string {
  if (status === 409 && code === "estado_desactualizado") {
    return "Este equipo cambió mientras lo mirabas. Se actualizó la lista; revisa su estado y vuelve a intentarlo.";
  }
  return mensaje || "No se pudo completar la acción. Inténtalo de nuevo.";
}

export type CuentaSinEquipo = { id: string; email: string };

/** Cuentas de dueño que se quedarían sin equipo activo al restringir (`details.cuentas` del 409). */
export function cuentasSinEquipo(details: unknown): CuentaSinEquipo[] {
  const cuentas = (details as { cuentas?: unknown } | null | undefined)?.cuentas;
  if (!Array.isArray(cuentas)) return [];
  return cuentas.filter(
    (c): c is CuentaSinEquipo => !!c && typeof c.id === "string" && typeof c.email === "string",
  );
}

/** ¿El cambio deja a un dueño en «Restringido» desde otro valor? Hay que avisar antes de guardar. */
export function restringeAlDueno(actual: PoliticaAcceso, nueva: PoliticaAcceso): boolean {
  return nueva.owner === "restringido" && actual.owner !== "restringido";
}

export function hayCambios(actual: PoliticaAcceso, nueva: PoliticaAcceso): boolean {
  return ROLES_POLITICA.some(({ clave }) => actual[clave] !== nueva[clave]);
}

/** Texto del dispositivo para listas: etiqueta del equipo o su plataforma, sin enums crudos. */
export function nombreDelEquipo(d: Pick<DispositivoAcceso, "device_label" | "plataforma" | "legacy">): string {
  if (d.device_label?.trim()) return d.device_label.trim();
  if (d.legacy) return "Equipo del registro anterior";
  return d.plataforma === "ios" ? "iPhone" : "Android";
}

// ----------------------------------------------------------------------------- en palabras (SEG)
type Cuenta = DispositivoAcceso["cuenta"];

/** Quién: el nombre de la cuenta, su correo o «una cuenta». */
export function quienEs(cuenta: Cuenta | undefined): string {
  return cuenta?.nombre?.trim() || cuenta?.email || "una cuenta";
}

/** «Pixel 8 · Android», sin repetir el sistema cuando la etiqueta ya lo dice. */
export function equipoEnPalabras(d: Pick<DispositivoAcceso, "device_label" | "plataforma" | "legacy">): string {
  const nombre = nombreDelEquipo(d);
  const sistema = d.plataforma === "ios" ? "iPhone" : "Android";
  return nombre === sistema || nombre.toLowerCase().includes(sistema.toLowerCase()) ? nombre : `${nombre} · ${sistema}`;
}

/** La línea de un equipo (SEG-05): qué es y qué pasó con él, en palabras. */
export function lineaDelEquipo(d: DispositivoAcceso, ahora: Date = new Date()): string {
  const equipo = equipoEnPalabras(d);
  if (d.estado === "pendiente") return `${equipo} · pidió entrar ${distanciaRelativa(d.created_at, ahora)}`;
  if (d.estado === "bloqueado") {
    const cuando = d.bloqueado_at ? ` el ${diaEnPalabras(d.bloqueado_at)}` : "";
    const alcance = d.bloqueo_equipo ? " para todas las cuentas" : "";
    return `${equipo} · bloqueado${alcance}${cuando}${d.motivo ? ` · ${d.motivo}` : ""}`;
  }
  return `${equipo} · ${d.ultimo_uso_at ? `usado ${distanciaRelativa(d.ultimo_uso_at, ahora)}` : "sin usar todavía"}`;
}

/** Cada alerta en una frase (SEG-07): quién hizo qué. */
export function fraseDeEvento(e: Pick<EventoAcceso, "tipo" | "cuenta" | "detalle">): string {
  const quien = quienEs(e.cuenta);
  switch (e.tipo) {
    case "dispositivo_pendiente":
      return `${quien} pidió entrar desde un equipo nuevo`;
    case "dispositivo_nuevo":
      return `${quien} entró desde un equipo nuevo`;
    case "dispositivo_aprobado":
      return `Se aprobó un equipo de ${quien}`;
    case "dispositivo_bloqueado_usado":
      return `Un equipo bloqueado de ${quien} intentó entrar`;
    case "login_fallido": {
      const previas = Number((e.detalle as { repeticiones_previas?: unknown } | null)?.repeticiones_previas ?? 0);
      const veces = Number.isFinite(previas) && previas > 0 ? `${previas + 1} intentos fallidos` : "Un intento fallido";
      return e.cuenta ? `${veces} de entrar con la cuenta de ${quien}` : `${veces} de entrar con una cuenta que no existe`;
    }
    case "login_bloqueado":
      return `Se bloqueó la entrada de ${quien} por intentos fallidos`;
    case "acceso_denegado_politica":
      return `La política no dejó entrar a ${quien} desde un equipo sin aprobar`;
    case "dispositivo_sin_id":
      return `${quien} intentó entrar desde un equipo que no se identificó`;
    case "dispositivo_compartido":
      return `Un equipo de ${quien} lo usan varias cuentas`;
    case "politica_cambiada":
      return e.cuenta ? `${quien} cambió la política de equipos nuevos` : "Se cambió la política de equipos nuevos";
    case "acceso_master":
      return "El administrador de plataforma entró al negocio";
    case "legado_pack":
      return `${quien} intentó entrar con el registro anterior de la app`;
  }
}

/** Desde dónde, con qué equipo y cuándo: la segunda línea de una alerta. */
export function lineaDeEvento(e: Pick<EventoAcceso, "canal" | "device_id_corto" | "ip" | "occurred_at">, ahora: Date = new Date()): string {
  return [CANAL[e.canal], e.ip ? `IP ${e.ip}` : null, distanciaRelativa(e.occurred_at, ahora)].filter(Boolean).join(" · ");
}

/** La política en una línea (SEG-02): «Gestores: necesitan tu aprobación · Dueño y colaboradores: entran sin aprobación». */
export function resumenDePolitica(p: PoliticaAcceso): string {
  const plural: Record<RolPolitica, string> = { owner: "Dueño", colaborador: "colaboradores", gestor: "gestores" };
  const grupo = (valor: ValorPolitica) =>
    ROLES_POLITICA.filter(({ clave }) => p[clave] === valor).map(({ clave }) => plural[clave]);
  const unir = (roles: string[]) => {
    const texto = roles.length > 1 ? `${roles.slice(0, -1).join(", ")} y ${roles[roles.length - 1]}` : roles[0];
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  };
  const con = grupo("restringido");
  const sin = grupo("abierto");
  return [
    con.length ? `${unir(con)}: ${con.length > 1 || con[0] !== "Dueño" ? "necesitan" : "necesita"} tu aprobación` : null,
    sin.length ? `${unir(sin)}: ${sin.length > 1 || sin[0] !== "Dueño" ? "entran" : "entra"} sin aprobación` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Qué alertas ver (SEG-09): las palabras del negocio sobre los niveles de la API. */
export const VISTAS_DE_ALERTAS: { value: string; label: string; severidad?: SeveridadEvento }[] = [
  { value: "", label: "Todas" },
  { value: "critico", label: "Necesitan atención", severidad: "critico" },
  { value: "aviso", label: "Avisos", severidad: "aviso" },
  { value: "info", label: "Informativas", severidad: "info" },
];

/** El equipo de la lista al que se refiere una alerta (misma cuenta y mismo identificador corto). */
export function equipoDelEvento(
  e: Pick<EventoAcceso, "cuenta" | "device_id_corto">,
  equipos: DispositivoAcceso[],
): DispositivoAcceso | undefined {
  if (!e.device_id_corto) return undefined;
  return equipos.find((d) => d.device_id_corto === e.device_id_corto && (!e.cuenta || d.cuenta?.id === e.cuenta.id));
}
