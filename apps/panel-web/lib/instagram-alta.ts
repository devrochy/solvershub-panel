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

// ------------------------------------------------------------------ Instagram Login (ruta b), cuentas y prueba de humo (4b)
export type CuentaDeInstagram = components["schemas"]["InstagramAccountStatusOut"];
export type DiagnosticoDeInstagram = components["schemas"]["InstagramDiagnosticOut"];

/** Cómo se conectó la cuenta, para la lista: el valor crudo de la API no se muestra. */
export function etiquetaDeRuta(ruta: string | null | undefined): string {
  if (ruta === "ig_instagram_login") return "Instagram Login";
  if (ruta === "ig_facebook_login") return "Facebook Login";
  return "Conexión de Instagram";
}

/** Estado de la cuenta en la lista: etiqueta, tono y qué hacer. Una cuenta degradada pide reconectar. */
export function estadoDeCuenta(c: Pick<CuentaDeInstagram, "status" | "status_reason">): {
  etiqueta: string;
  tono: "success" | "warning";
  ayuda: string | null;
} {
  if (c.status === "degraded") {
    return {
      etiqueta: "Degradada",
      tono: "warning",
      ayuda: c.status_reason ?? "El acceso a la cuenta falló: reconéctala con Instagram.",
    };
  }
  return { etiqueta: "Conectada", tono: "success", ayuda: null };
}

/** Días hasta que vence el acceso de una cuenta de Instagram Login, o `null` si no aplica. */
export function diasParaVencer(vence: string | null | undefined, ahora: Date = new Date()): number | null {
  if (!vence) return null;
  const ms = new Date(vence).getTime() - ahora.getTime();
  return Number.isFinite(ms) ? Math.floor(ms / 86_400_000) : null;
}

/** Aviso sobre el acceso de la cuenta (se renueva solo cada día; esto es por si el refresco falla). */
export function avisoDeVencimiento(vence: string | null | undefined, ahora: Date = new Date()): string | null {
  const dias = diasParaVencer(vence, ahora);
  if (dias === null) return null;
  if (dias < 0) return "El acceso a la cuenta venció: reconéctala con Instagram para volver a responder.";
  if (dias <= 5) return `El acceso a la cuenta vence en ${dias === 0 ? "menos de un día" : `${dias} ${dias === 1 ? "día" : "días"}`}. Se renueva solo; si no, reconéctala.`;
  return null;
}

/** Instagram a veces devuelve el código con un `#_` al final: no es parte del código. */
export function limpiarCodigoDeInstagram(code: string): string {
  return code.trim().replace(/#_$/, "");
}

/** ¿La URL de retorno trae lo que hace falta, o el usuario canceló / Instagram devolvió un error? */
export type RetornoDeInstagram =
  | { tipo: "listo"; code: string; state: string }
  | { tipo: "cancelado"; motivo: string }
  | { tipo: "invalido" };

export function interpretarRetorno(params: {
  code?: string;
  state?: string;
  error?: string;
  error_reason?: string;
  error_description?: string;
}): RetornoDeInstagram {
  if (params.error) {
    const quien = params.error === "access_denied" ? "Cancelaste la autorización en Instagram." : "Instagram no autorizó la conexión.";
    return { tipo: "cancelado", motivo: quien };
  }
  const code = limpiarCodigoDeInstagram(params.code ?? "");
  const state = (params.state ?? "").trim();
  if (!code || !state) return { tipo: "invalido" };
  return { tipo: "listo", code, state };
}

/** Qué decirle a la persona según lo más probable cuando la prueba de humo no recibió el mensaje. */
export function explicarDiagnostico(causa: string | null | undefined): { titulo: string; pasos: string[] } {
  switch (causa) {
    case "token_degraded":
      return {
        titulo: "El acceso a la cuenta falló",
        pasos: ["Reconecta la cuenta con Instagram desde esta pantalla. Mientras tanto no recibe ni responde mensajes."],
      };
    case "not_subscribed":
      return {
        titulo: "Meta no confirmó que la cuenta pueda recibir mensajes",
        pasos: ["Vuelve a conectar la cuenta. Si el problema sigue, revisa que la app tenga activos los mensajes de Instagram."],
      };
    default:
      return {
        titulo: "No llegó el mensaje de prueba",
        pasos: [
          "En Instagram abre Configuración → Mensajes y respuestas → Herramientas conectadas.",
          "Activa «Permitir acceso a los mensajes». Si está apagado, Meta no entrega los mensajes y nunca lo reporta como error.",
          "Confirma que la cuenta sea profesional (empresa o creador) y que mandaste el mensaje desde otro perfil.",
          "Vuelve a probar.",
        ],
      };
  }
}
