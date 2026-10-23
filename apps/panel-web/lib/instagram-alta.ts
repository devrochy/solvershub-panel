import type { components } from "@/lib/api/schema";

/**
 * Alta de Instagram con Facebook Login (HU-CHAN-04, ADR-0152): reglas puras de presentación. Sin JSX ni fetch.
 * El panel nunca ve tokens: solo el `code` del popup (que viaja a la API) y las cuentas que ella describe.
 */

export type EstadoInstagram = components["schemas"]["InstagramState"];
export type CuentaDescubierta = components["schemas"]["InstagramAccountOut"];
export type ResultadoConexionInstagram = components["schemas"]["InstagramConnectOut"];

export type BloqueoDelAlta = { titulo: string; texto: string };

/** Por qué no se puede empezar el alta en este entorno o con este plan; `null` si se puede. */
export function bloqueoDelAltaInstagram(
  estado: Pick<EstadoInstagram, "plan_includes" | "meta_configured">,
): BloqueoDelAlta | null {
  if (!estado.plan_includes) {
    return {
      titulo: "Tu plan no incluye Instagram",
      texto: "Instagram está en los planes de pago. Cambia de plan para conectar la cuenta de tu negocio.",
    };
  }
  if (!estado.meta_configured) {
    return {
      titulo: "Conectar Instagram no está disponible en este entorno",
      texto: "Falta configurar la app de Meta de la plataforma para Instagram.",
    };
  }
  return null;
}

/** Cuentas que se pueden marcar: cumplen los roles y no están ya conectadas a este negocio. */
export function cuentaSeleccionable(c: Pick<CuentaDescubierta, "eligible" | "already_connected">): boolean {
  return c.eligible && !c.already_connected;
}

/** Selección inicial: todas las que se pueden conectar. */
export function seleccionInicialInstagram(cuentas: CuentaDescubierta[]): string[] {
  return cuentas.filter(cuentaSeleccionable).map((c) => c.ig_user_id);
}

/** Por qué una cuenta no se puede marcar, o `null` si sí. */
export function motivoCuentaNoSeleccionable(c: CuentaDescubierta): string | null {
  if (c.already_connected) return "Ya está conectada a este negocio.";
  if (!c.eligible) return c.reason ?? "No cumples los roles que pide Meta para la Página vinculada.";
  return null;
}

/** Nombre de la cuenta: «@usuario», o su ID si Meta no devolvió el usuario. */
export function nombreDeCuenta(c: Pick<CuentaDescubierta, "ig_user_id" | "username">): string {
  return c.username ? `@${c.username}` : `Cuenta ${c.ig_user_id}`;
}

/** Texto de una cuenta en el resultado: su nombre si se conoce, si no el ID. */
export function nombreDeCuentaPorId(igUserId: string, cuentas: CuentaDescubierta[]): string {
  const c = cuentas.find((x) => x.ig_user_id === igUserId);
  return c ? nombreDeCuenta(c) : `Cuenta ${igUserId}`;
}

/** Aviso cuando la persona no administra ninguna cuenta de Instagram vinculada a una Página. */
export function avisoSinCuentas(paginasSinInstagram: number): string {
  const base = "No encontramos cuentas de Instagram vinculadas a las Páginas que administras con esa cuenta de Facebook.";
  const ayuda =
    " La cuenta de Instagram debe ser profesional (empresa o creador) y estar vinculada a una Página de Facebook.";
  return paginasSinInstagram > 0
    ? `${base} ${paginasSinInstagram === 1 ? "1 de tus Páginas no tiene" : `${paginasSinInstagram} de tus Páginas no tienen`} Instagram vinculado.${ayuda}`
    : `${base}${ayuda}`;
}

export type ResumenConexionInstagram = {
  conectadas: ResultadoConexionInstagram["connected"];
  /** Guardadas, pero Meta no confirmó la suscripción: no reciben mensajes hasta reintentar. */
  sinSuscripcion: ResultadoConexionInstagram["connected"];
  omitidas: ResultadoConexionInstagram["skipped"];
  /** ¿Quedó al menos una cuenta recibiendo mensajes? */
  recibiendo: boolean;
};

export function resumirConexionInstagram(r: ResultadoConexionInstagram): ResumenConexionInstagram {
  return {
    conectadas: r.connected,
    sinSuscripcion: r.connected.filter((c) => !c.subscribed),
    omitidas: r.skipped,
    recibiendo: r.connected.some((c) => c.subscribed),
  };
}
