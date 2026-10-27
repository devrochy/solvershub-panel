/**
 * Publicar una versión de una plantilla con opciones como plantilla de Meta (SPEC-40, ADR-0172 §2,
 * HU-OPC-04 y HU-OPC-06): lógica pura del diálogo y del estado. Los textos están aquí (y no en los
 * componentes) para que una sola fuente diga qué significa cada estado y cada resultado en lenguaje del
 * dueño; los componentes solo los pintan.
 *
 * El backend sigue siendo quien decide: los topes (25 caracteres por botón, 10 botones) se muestran para
 * que el dueño los vea, pero la validación real corre en `POST …/publicar-en-meta` antes de llamar a Meta.
 */
import type { HealthConnectionMeta, OpcionesMetaEstado, OpcionesMetaResultado } from "@/lib/api/types";
import type { ErrorDeApi } from "@/lib/plantillas-opciones";

export const MAX_BOTON_META = 25;
export const MAX_BOTONES_META = 10;
export const MAX_EJEMPLO_META = 60;

export type Tono = "success" | "warning" | "danger" | "info" | "neutral";

// ------------------------------------------------------------------ categoría e idioma
export type CategoriaMeta = "UTILITY" | "MARKETING";

export const CATEGORIAS_META: readonly { valor: CategoriaMeta; etiqueta: string; ayuda: string }[] = [
  {
    valor: "UTILITY",
    etiqueta: "Utilidad",
    ayuda:
      "Para avisos sobre algo que el cliente ya pidió o hizo: confirmar una cita, un pedido o un pago. Suele costar menos y aprobarse más fácil.",
  },
  {
    valor: "MARKETING",
    etiqueta: "Marketing",
    ayuda:
      "Para promociones, ofertas o invitaciones. Cuesta más y requiere que el cliente haya aceptado recibir mensajes promocionales (consentimiento).",
  },
];

/** Meta decide la categoría final: lo que elige el dueño es una petición, y el cobro cambia con ella. */
export const AVISO_CATEGORIA =
  "Meta revisa el mensaje y puede rechazarlo o cambiarle la categoría después; el cobro cambia con la categoría que quede.";

export const IDIOMAS_META: readonly { valor: string; etiqueta: string }[] = [
  { valor: "es", etiqueta: "Español" },
  { valor: "es_CO", etiqueta: "Español (Colombia)" },
  { valor: "es_MX", etiqueta: "Español (México)" },
  { valor: "es_AR", etiqueta: "Español (Argentina)" },
  { valor: "en", etiqueta: "Inglés" },
  { valor: "pt_BR", etiqueta: "Portugués (Brasil)" },
];

export const IDIOMA_POR_DEFECTO = "es";

export function categoriaEtiqueta(categoria: string | null | undefined): string {
  if (!categoria) return "Sin categoría";
  return CATEGORIAS_META.find((c) => c.valor === categoria)?.etiqueta ?? categoria;
}

export const esCategoriaMeta = (v: string): v is CategoriaMeta => v === "UTILITY" || v === "MARKETING";

// ------------------------------------------------------------------ conexiones
/**
 * Una conexión sirve para publicar si es de WhatsApp y está viva (`connected` o `degraded`: una degradada sigue
 * sirviendo) con el token vigente. `error`, `revoked`, `draft` y `pending` no pueden crear plantillas.
 */
export function motivoNoLista(c: HealthConnectionMeta, ahora: Date = new Date()): string | null {
  if (c.channel !== "whatsapp") return "No es una conexión de WhatsApp.";
  if (c.status === "revoked") return "Está pausada.";
  if (c.status === "error") return "Tiene un error: revisa su salud.";
  if (c.status !== "connected" && c.status !== "degraded") return "Todavía no termina de conectarse.";
  if (c.token_expires_at && new Date(c.token_expires_at).getTime() <= ahora.getTime()) return "Su token venció: reconéctala.";
  return null;
}

export function conexionesParaPublicar(conexiones: readonly HealthConnectionMeta[], ahora: Date = new Date()) {
  const listas: HealthConnectionMeta[] = [];
  const noListas: { conexion: HealthConnectionMeta; motivo: string }[] = [];
  for (const c of conexiones) {
    if (c.channel !== "whatsapp") continue;
    const motivo = motivoNoLista(c, ahora);
    if (motivo) noListas.push({ conexion: c, motivo });
    else listas.push(c);
  }
  return { listas, noListas };
}

/** Nombre corto de una conexión para el selector: lo que la distingue sin enseñar ids. */
export function nombreDeConexion(c: Pick<HealthConnectionMeta, "id" | "environment" | "origin">): string {
  const origen = c.origin === "embedded_signup" ? "Conectada con Facebook" : c.origin === "byok" ? "App propia" : "WhatsApp";
  const entorno = c.environment === "production" ? "Producción" : "Prueba";
  return `${origen} · ${entorno} · …${c.id.slice(-6)}`;
}

/** Enlace a las plantillas de Meta de la conexión; con varias (o ninguna elegida) lleva al selector. */
export function enlacePlantillasMeta(conexiones: readonly Pick<HealthConnectionMeta, "id" | "channel">[], elegida?: string | null): string {
  const whatsapp = conexiones.filter((c) => c.channel === "whatsapp");
  if (elegida && whatsapp.some((c) => c.id === elegida)) return `/conexiones/meta/${elegida}/plantillas`;
  return whatsapp.length === 1 ? `/conexiones/meta/${whatsapp[0].id}/plantillas` : "/plantillas";
}

// ------------------------------------------------------------------ estado de la plantilla en Meta
export type Presentacion = { etiqueta: string; tono: Tono; explicacion: string };

const ESTADOS_META: Record<string, Presentacion> = {
  DRAFT: {
    etiqueta: "Enviando a Meta",
    tono: "info",
    explicacion: "Reservamos la plantilla en tu cuenta de WhatsApp, pero Meta todavía no responde.",
  },
  PENDING: {
    etiqueta: "En revisión",
    tono: "warning",
    explicacion: "Meta la está revisando. Suele tardar de unos minutos a un día; te aparecerá aquí aprobada o rechazada.",
  },
  APPROVED: {
    etiqueta: "Aprobada",
    tono: "success",
    explicacion: "Meta la aprobó: fuera de las 24 horas el mensaje sale con sus botones y el cliente puede tocarlos.",
  },
  REJECTED: {
    etiqueta: "Rechazada",
    tono: "danger",
    explicacion: "Meta no la aceptó. Una plantilla rechazada no se edita: corrige el mensaje y publica una versión nueva.",
  },
  PAUSED: {
    etiqueta: "Pausada",
    tono: "warning",
    explicacion: "Meta la pausó, normalmente por mala calidad (clientes que la reportan o no la leen). Mientras siga pausada no se puede usar.",
  },
  DISABLED: {
    etiqueta: "Desactivada",
    tono: "danger",
    explicacion: "Meta la desactivó y no se puede volver a usar. Publica una versión nueva si quieres seguir enviándola.",
  },
  IN_APPEAL: {
    etiqueta: "En apelación",
    tono: "warning",
    explicacion: "Meta está revisando una apelación sobre esta plantilla.",
  },
  DELETED: {
    etiqueta: "Borrada en Meta",
    tono: "danger",
    explicacion: "La plantilla se borró en Meta. Publica una versión nueva para volver a enviarla.",
  },
  PENDING_DELETION: {
    etiqueta: "Borrada en Meta",
    tono: "danger",
    explicacion: "La plantilla se está borrando en Meta. Publica una versión nueva para volver a enviarla.",
  },
};

export function presentacionDeEstado(estado: string | null | undefined): Presentacion {
  const clave = (estado ?? "").toUpperCase();
  return (
    ESTADOS_META[clave] ?? {
      etiqueta: estado ? `Estado de Meta: ${estado}` : "Sin estado",
      tono: "neutral",
      explicacion: "Meta devolvió un estado que el panel no conoce. Revísalo en las plantillas de la conexión.",
    }
  );
}

// ------------------------------------------------------------------ resultado de una publicación
export type PresentacionResultado = Presentacion & {
  /** Qué hacer ahora, en una frase. */
  siguiente?: string;
};

const RESULTADOS: Record<string, PresentacionResultado> = {
  published: {
    etiqueta: "Enviada a Meta",
    tono: "success",
    explicacion: "La plantilla se creó en tu cuenta de WhatsApp y Meta la está revisando.",
    siguiente: "Cuando la apruebe, fuera de las 24 horas el mensaje saldrá con botones. Mientras tanto sale como texto.",
  },
  already_published: {
    etiqueta: "Ya estaba en Meta",
    tono: "info",
    explicacion: "Esta versión ya había sido enviada a Meta: no se creó otra plantilla ni se gastó otro cupo.",
  },
  network_error: {
    etiqueta: "Sin confirmar",
    tono: "warning",
    explicacion: "Hubo un corte al hablar con Meta y no sabemos si la plantilla llegó a crearse.",
    siguiente: "Puedes reintentar: antes de crear nada se revisa si Meta ya la tiene, así que no se duplica.",
  },
  rate_limited: {
    etiqueta: "Límite de creación",
    tono: "warning",
    explicacion: "Meta limita cuántas plantillas se pueden crear por hora en una cuenta de WhatsApp.",
    siguiente: "Espera un rato y reintenta.",
  },
  in_progress: {
    etiqueta: "Ya se está enviando",
    tono: "info",
    explicacion: "Otro intento de publicar esta misma versión sigue en curso.",
    siguiente: "Espera unos segundos, revisa el estado y reintenta solo si no avanza.",
  },
  internal_error: {
    etiqueta: "Falló de nuestro lado",
    tono: "warning",
    explicacion: "Algo falló al procesar la publicación. La versión sigue publicada como mensaje interactivo.",
    siguiente: "Reintenta en unos minutos: no se duplica la plantilla.",
  },
  meta_rejected: {
    etiqueta: "Meta no la aceptó",
    tono: "danger",
    explicacion: "Meta respondió con un error al crear la plantilla y no se creó nada.",
    siguiente: "Revisa el motivo, corrige el mensaje y publica una versión nueva.",
  },
  invalid_definition: {
    etiqueta: "No cumple las reglas de Meta",
    tono: "danger",
    explicacion: "El mensaje no cumple los límites de una plantilla de Meta. No se envió nada a Meta.",
    siguiente: "Corrige el borrador y publica una versión nueva.",
  },
  name_taken: {
    etiqueta: "Nombre ya usado",
    tono: "danger",
    explicacion: "Ya existe en tu cuenta de WhatsApp otra plantilla con el nombre de esta versión.",
    siguiente: "Publica una versión nueva: tendrá otro nombre.",
  },
  other_account: {
    etiqueta: "Es de otra cuenta",
    tono: "danger",
    explicacion: "Esta versión ya está ligada a una plantilla de otra cuenta de WhatsApp.",
    siguiente: "Publica una versión nueva para usar esta conexión.",
  },
  template_deleted: {
    etiqueta: "Borrada en Meta",
    tono: "danger",
    explicacion: "La plantilla que tenía esta versión se borró en Meta.",
    siguiente: "Publica una versión nueva para volver a enviarla.",
  },
  meta_id_taken: {
    etiqueta: "Plantilla repetida",
    tono: "danger",
    explicacion: "Meta devolvió una plantilla que ya está registrada en otra versión de tu negocio.",
    siguiente: "No la repitas: escribe al equipo de SolversHub para que lo revise.",
  },
  connection_not_ready: {
    etiqueta: "Conexión no lista",
    tono: "danger",
    explicacion: "La conexión de WhatsApp elegida no está lista para crear plantillas (cuenta o acceso).",
    siguiente: "Revisa su salud en Conexiones, o elige otra, y vuelve a publicar.",
  },
  template_quota_full: {
    etiqueta: "Cuenta llena",
    tono: "danger",
    explicacion: "Tu cuenta de WhatsApp ya tiene el máximo de plantillas que permite Meta. No se llamó a Meta.",
    siguiente: "Borra plantillas que no uses y vuelve a publicar esta versión.",
  },
  version_retired: {
    etiqueta: "Versión retirada",
    tono: "danger",
    explicacion: "Esta versión está retirada y ya no se envía.",
    siguiente: "Publica una versión nueva.",
  },
  version_not_found: {
    etiqueta: "No encontrada",
    tono: "danger",
    explicacion: "No encontramos esa versión de la plantilla.",
    siguiente: "Recarga la página.",
  },
  invalid_category: {
    etiqueta: "Categoría inválida",
    tono: "danger",
    explicacion: "La categoría debe ser Utilidad o Marketing.",
  },
  invalid_language: {
    etiqueta: "Idioma inválido",
    tono: "danger",
    explicacion: "El idioma elegido no es válido. Usa uno de la lista.",
  },
};

export function presentacionDeResultado(outcome: string): PresentacionResultado {
  return (
    RESULTADOS[outcome] ?? {
      etiqueta: "No se pudo publicar",
      tono: "warning",
      explicacion: "La publicación en Meta no terminó. La versión sigue publicada como mensaje interactivo.",
    }
  );
}

export const FALLO_NO_ROMPE_LA_VERSION = "La versión sigue publicada como mensaje interactivo: lo ven los clientes que escribieron en las últimas 24 horas.";

// ------------------------------------------------------------------ estado de una versión (lo persistido + lo último intentado)
export type EstadoDeVersion = {
  /** Hay plantilla de Meta ligada a la versión. */
  enMeta: boolean;
  aprobada: boolean;
  insignia: { etiqueta: string; tono: Tono };
  explicacion: string;
  siguiente?: string;
  /** Motivo de rechazo, recomendación de Meta o error del último intento. */
  motivo?: string;
  recomendacion?: string;
  /** Solo si repetir la misma petición puede resolverlo (nunca se reenvía sola). */
  reintentable: boolean;
  categoriaCambiada: { de: string; a: string } | null;
};

/**
 * Qué decir de una versión. `meta` es lo persistido (lo escriben los webhooks de estado y de categoría de
 * Meta); `ultimo` es la respuesta del último intento hecho en esta pantalla, que sí trae `outcome` y
 * `reintentable` (la API no los guarda). `ultimo` solo manda mientras la plantilla siga sin respuesta de
 * Meta: una vez que hay estado real (PENDING, APPROVED…), ese manda.
 */
export function estadoDeVersion(meta: OpcionesMetaEstado | null | undefined, ultimo?: OpcionesMetaResultado | null): EstadoDeVersion {
  const sinRespuestaDeMeta = !meta || meta.estado === "DRAFT";
  if (ultimo && !ultimo.ok && sinRespuestaDeMeta) {
    const r = presentacionDeResultado(ultimo.outcome);
    return {
      enMeta: !!meta,
      aprobada: false,
      insignia: { etiqueta: r.etiqueta, tono: r.tono },
      explicacion: r.explicacion,
      siguiente: r.siguiente,
      motivo: ultimo.motivo ?? undefined,
      reintentable: ultimo.reintentable,
      categoriaCambiada: null,
    };
  }
  if (!meta) {
    return {
      enMeta: false,
      aprobada: false,
      insignia: { etiqueta: "Sin enviar a Meta", tono: "neutral" },
      explicacion: "Esta versión solo existe como mensaje interactivo. Publícala en Meta para que también salga fuera de las 24 horas.",
      reintentable: false,
      categoriaCambiada: null,
    };
  }
  const base = presentacionDeEstado(meta.estado);
  const cambio =
    meta.categoria_anterior && meta.categoria && meta.categoria_anterior !== meta.categoria
      ? { de: meta.categoria_anterior, a: meta.categoria }
      : null;
  if (meta.estado === "DRAFT") {
    const error = meta.error_de_publicacion?.trim();
    if (!error) {
      return {
        enMeta: true,
        aprobada: false,
        insignia: { etiqueta: base.etiqueta, tono: base.tono },
        explicacion: base.explicacion,
        siguiente: "Si en unos minutos no cambia, vuelve a abrir esta página.",
        reintentable: false,
        categoriaCambiada: cambio,
      };
    }
    // `error_de_publicacion` guarda el motivo o, si no hubo, el código del resultado.
    const conocido = RESULTADOS[error];
    return {
      enMeta: true,
      aprobada: false,
      insignia: { etiqueta: conocido?.etiqueta ?? "No se pudo enviar", tono: conocido?.tono ?? "warning" },
      explicacion: conocido?.explicacion ?? "El último intento de enviarla a Meta no terminó.",
      siguiente: conocido?.siguiente ?? "Puedes reintentar: se revisa primero si Meta ya la tiene, así que no se duplica.",
      motivo: conocido ? undefined : error,
      reintentable: conocido ? REINTENTABLES.has(error) : true,
      categoriaCambiada: cambio,
    };
  }
  const rechazada = meta.estado === "REJECTED";
  return {
    enMeta: true,
    aprobada: meta.estado === "APPROVED",
    insignia: { etiqueta: base.etiqueta, tono: base.tono },
    explicacion: base.explicacion,
    motivo: rechazada ? (meta.motivo_rechazo ?? undefined) : undefined,
    recomendacion: rechazada ? (meta.recomendacion ?? undefined) : undefined,
    reintentable: false,
    categoriaCambiada: cambio,
  };
}

/** Los mismos que el backend marca como reintentables (`core/kernel/opciones/meta.py::REINTENTABLES`). */
export const REINTENTABLES: ReadonlySet<string> = new Set(["network_error", "rate_limited", "in_progress", "internal_error"]);

// ------------------------------------------------------------------ degradación
/**
 * Sin plantilla de Meta aprobada, dentro de las 24 horas todo sigue igual (interactivo) y fuera de ellas el
 * mensaje sale como texto con las opciones numeradas, sin ejecución directa.
 */
export function avisoDeDegradacion(estado: EstadoDeVersion): { titulo: string; texto: string } | null {
  if (estado.aprobada) return null;
  const texto =
    "Dentro de las 24 horas desde el último mensaje del cliente, el mensaje sale con botones y tocar una opción ejecuta la acción. " +
    "Fuera de ese plazo sale como texto con las opciones numeradas y tocarlas no ejecuta nada.";
  return {
    titulo: estado.enMeta
      ? "Mientras Meta no la apruebe, fuera de las 24 horas sale como texto"
      : "Sin plantilla de Meta, fuera de las 24 horas sale como texto",
    texto,
  };
}

// ------------------------------------------------------------------ vista previa de los componentes de Meta
type ComponenteMeta = { type?: string; text?: string; buttons?: { type?: string; text?: string }[] };

export type ResumenDeComponentes = {
  cuerpo: string;
  pie: string | null;
  botones: { texto: string; largo: number; excede: boolean }[];
  /** Hay más botones que el tope de Meta. */
  excedeBotones: boolean;
};

export function resumirComponentes(componentes: readonly unknown[] | null | undefined): ResumenDeComponentes {
  const lista = (componentes ?? []).filter((c): c is ComponenteMeta => !!c && typeof c === "object");
  const tipo = (t: string) => lista.find((c) => (c.type ?? "").toUpperCase() === t);
  const botones = (tipo("BUTTONS")?.buttons ?? [])
    .filter((b) => (b.type ?? "").toUpperCase() === "QUICK_REPLY")
    .map((b) => {
      const texto = b.text ?? "";
      const largo = [...texto].length;
      return { texto, largo, excede: largo > MAX_BOTON_META };
    });
  return {
    cuerpo: tipo("BODY")?.text ?? "",
    pie: tipo("FOOTER")?.text ?? null,
    botones,
    excedeBotones: botones.length > MAX_BOTONES_META,
  };
}

// ------------------------------------------------------------------ valores de muestra de las variables
/** Meta exige un ejemplo por variable y lo revisa: nunca datos de un cliente real. */
export const EJEMPLOS_SUGERIDOS: Record<string, string> = {
  "cliente.nombre": "Ana",
  "cliente.telefono": "3001234567",
  "negocio.nombre": "Mi negocio",
};

export function ejemplosIniciales(variables: readonly string[]): Record<string, string> {
  return Object.fromEntries(variables.map((v) => [v, EJEMPLOS_SUGERIDOS[v] ?? "Ejemplo"]));
}

/** Solo viaja lo escrito, recortado al tope; una variable sin valor la completa el backend. */
export function ejemplosParaEnviar(ejemplos: Record<string, string>): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const [ruta, valor] of Object.entries(ejemplos)) {
    const v = [...valor.trim()].slice(0, MAX_EJEMPLO_META).join("");
    if (v) salida[ruta] = v;
  }
  return salida;
}

// ------------------------------------------------------------------ la petición
export type PedidoMeta = {
  connection_id: string;
  categoria: CategoriaMeta;
  idioma: string;
  ejemplos: Record<string, string>;
};

/** Por qué no se puede enviar todavía (o null). La confirmación explícita es parte de la validación. */
export function motivoNoEnviar(p: { conexion: string | null; categoria: string | null; entendido: boolean }): string | null {
  if (!p.conexion) return "Elige la conexión de WhatsApp.";
  if (!p.categoria || !esCategoriaMeta(p.categoria)) return "Elige la categoría.";
  if (!p.entendido) return "Confirma que entiendes lo que va a pasar.";
  return null;
}

/** Nombre que tendrá la plantilla en Meta: `<clave>_v<n>`. */
export const nombreEnMeta = (clave: string, version: number): string => `${clave}_v${version}`;

// ------------------------------------------------------------------ errores de la API
/**
 * Texto de un fallo de la petición (no del resultado: ese llega con 200 y `ok: false`). Contempla el sobre
 * propio `{error: {code, message, details}}` y el 422 estándar de FastAPI (`detail`), que el BFF traduce a
 * «Revisa: categoria».
 */
export function mensajeDePublicacion(e: Pick<ErrorDeApi, "status" | "code" | "mensaje" | "campos">): string {
  const campos = e.campos ?? [];
  if (e.status === 403) return "Solo el propietario del negocio puede publicar en Meta.";
  if (e.status === 404) return "Esa plantilla o versión ya no existe. Recarga la página.";
  if (e.status === 409) return e.code === "version_retirada" ? "Esa versión está retirada. Publica una versión nueva." : e.mensaje;
  if (e.status === 422) {
    if (e.code === "categoria_invalida" || campos.includes("categoria") || /categoria/i.test(e.mensaje)) {
      return "Elige una categoría válida: Utilidad o Marketing.";
    }
    if (e.code === "idioma_invalido" || campos.includes("idioma")) return "Elige un idioma de la lista.";
    if (e.code === "conexion_invalida" || campos.includes("connection_id")) return "Elige una conexión de WhatsApp de la lista.";
    return e.mensaje;
  }
  if (e.status === 0 || e.status >= 500) {
    return "No se pudo completar la solicitud. Puedes reintentar: no se duplica la plantilla en Meta.";
  }
  return e.mensaje;
}

/** Un fallo de red o del servidor puede haber llegado a Meta: reintentar es seguro (el backend concilia). */
export const esFalloReintentable = (e: Pick<ErrorDeApi, "status">): boolean => e.status === 0 || e.status >= 500;
