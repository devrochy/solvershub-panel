/**
 * Asistente de primer uso (HU-UX-21, SPEC-41). Lógica pura: pasos, decisiones visuales y su traducción a
 * lo que guarda la API. El estado del recorrido y que esté «completo» los decide el servidor
 * (`/admin/onboarding`); aquí solo se arma lo que el dueño elige con clics.
 */
import type { IdentitySettings, PrimerosPasos } from "@/lib/api/types";
import type { Franja } from "@/lib/horario-atencion";

export type Recorrido = PrimerosPasos["recorrido"];

export const TOTAL_PASOS = 6;

export const PASOS = [
  { id: "negocio", titulo: "Cuéntanos de tu negocio", corto: "Tu negocio" },
  { id: "voz", titulo: "¿Cómo quieres que hable?", corto: "Cómo habla" },
  { id: "reglas", titulo: "Horario y reglas", corto: "Horario y reglas" },
  { id: "conocimiento", titulo: "Lo que ya sabe de tu negocio", corto: "Qué sabe" },
  { id: "crear", titulo: "Crea tu agente", corto: "Crear" },
  { id: "probar", titulo: "Pruébalo", corto: "Probar" },
] as const;

export type IdDePaso = (typeof PASOS)[number]["id"];

// --------------------------------------------------------------------------- tipo de negocio

export type TipoDeNegocio = "ventas" | "agenda" | "cobranza" | "suscripciones";

export const TIPOS_DE_NEGOCIO: {
  id: TipoDeNegocio;
  titulo: string;
  ayuda: string;
  /** Tipo de contenido del paso «Qué sabe» (`CONTENIDO` de primeros-pasos). */
  contenido: "catalogo" | "servicios" | "cartera" | null;
  nombres: string[];
}[] = [
  {
    id: "ventas",
    titulo: "Vendo productos o planes",
    ayuda: "Responde dudas, cotiza y toma el pedido.",
    contenido: "catalogo",
    nombres: ["Sofía", "Vera", "Mateo"],
  },
  {
    id: "agenda",
    titulo: "Agendo citas",
    ayuda: "Ofrece horarios y reserva la cita.",
    contenido: "servicios",
    nombres: ["Luna", "Agenda", "Dani"],
  },
  {
    id: "cobranza",
    titulo: "Cobro cartera",
    ayuda: "Recuerda pagos y acuerda promesas.",
    contenido: "cartera",
    nombres: ["Clara", "Cobros", "Nico"],
  },
  {
    id: "suscripciones",
    titulo: "Gestiono suscripciones",
    ayuda: "Atiende a quien ya es cliente de un plan.",
    contenido: null,
    nombres: ["Alma", "Planes", "Leo"],
  },
];

export type QueVende = "productos" | "planes" | "ambos";

export const OPCIONES_QUE_VENDE: { id: QueVende; titulo: string; ayuda: string }[] = [
  { id: "productos", titulo: "Productos", ayuda: "Toma el pedido: ítems, entrega y pago." },
  { id: "planes", titulo: "Planes", ayuda: "Contrata el plan que elige el cliente." },
  { id: "ambos", titulo: "Los dos", ayuda: "Productos y planes." },
];

// --------------------------------------------------------------------------------------- voz

export type Tono = "cercano" | "formal" | "neutral" | "informal";
export type Emojis = "none" | "sparse" | "free";
export type Largo = "cortas" | "normal" | "detalladas";

export const TONOS: { id: Tono; titulo: string; muestra: string }[] = [
  { id: "cercano", titulo: "Cercano", muestra: "¡Hola! Cuéntame, ¿en qué te ayudo?" },
  { id: "formal", titulo: "Profesional", muestra: "Buenas tardes. ¿En qué puedo ayudarle?" },
  { id: "neutral", titulo: "Directo", muestra: "Hola. Dime qué necesitas." },
  { id: "informal", titulo: "Relajado", muestra: "¡Ey! ¿Qué se te ofrece?" },
];

export const EMOJIS: { id: Emojis; titulo: string }[] = [
  { id: "none", titulo: "Ninguno" },
  { id: "sparse", titulo: "Pocos" },
  { id: "free", titulo: "Muchos" },
];

export const LARGOS: { id: Largo; titulo: string; ayuda: string; caracteres: number }[] = [
  { id: "cortas", titulo: "Cortas", ayuda: "Directas, pensadas para el celular.", caracteres: 300 },
  { id: "normal", titulo: "Normales", ayuda: "Lo habitual.", caracteres: 500 },
  { id: "detalladas", titulo: "Detalladas", ayuda: "Explican con más detalle.", caracteres: 900 },
];

export const CALIDEZ_MIN = 1;
export const CALIDEZ_MAX = 5;
export const CALIDEZ_ETIQUETAS = ["Sobrio", "Reservado", "Amable", "Cálido", "Muy cálido"] as const;

/**
 * Frase de ejemplo para la burbuja de voz. Es texto fijo según tono, calidez, emojis y largo: no llama
 * a ningún modelo, así cambia al instante y no cuesta nada.
 */
export function muestraDeVoz(
  voz: { tono: Tono; calidez: number; emojis: Emojis; largo: Largo },
  nombreDelAgente: string,
  negocio: string,
): string {
  const quien = nombreDelAgente.trim() || "tu asistente";
  const donde = negocio.trim();
  const saludo: Record<Tono, string> = {
    cercano: "¡Hola!",
    formal: "Buenas tardes.",
    neutral: "Hola.",
    informal: "¡Ey!",
  };
  const ofrece: Record<Tono, string> = {
    cercano: "¿En qué te puedo ayudar hoy?",
    formal: "¿En qué puedo ayudarle?",
    neutral: "¿Qué necesitas?",
    informal: "¿Qué se te ofrece?",
  };
  const presenta =
    voz.tono === "formal" || voz.tono === "neutral"
      ? `Le atiende ${quien}${donde ? `, de ${donde}` : ""}.`
      : `Soy ${quien}${donde ? `, de ${donde}` : ""}.`;
  const calidez =
    voz.calidez >= 4 ? "Me encanta poder ayudarte." : voz.calidez === 3 ? "Con gusto te ayudo." : "";
  const detalle =
    voz.largo === "detalladas"
      ? "Puedo contarte los detalles, los precios y los horarios, y dejar todo listo por aquí mismo."
      : "";
  const emoji = voz.emojis === "none" ? "" : voz.emojis === "free" ? " 😊✨" : " 🙂";
  const partes =
    voz.largo === "cortas" ? [saludo[voz.tono], ofrece[voz.tono]] : [saludo[voz.tono], presenta, calidez, detalle, ofrece[voz.tono]];
  return `${partes.filter(Boolean).join(" ")}${emoji}`;
}

// ------------------------------------------------------------------------- horario y reglas

/** Horario del comercio por clics: días activos más un bloque de horas. */
export type BloqueDeHoras = "manana" | "tarde" | "jornada" | "todo";

export const BLOQUES_DE_HORAS: { id: BloqueDeHoras; titulo: string; desde: string; hasta: string }[] = [
  { id: "manana", titulo: "Mañana", desde: "08:00", hasta: "12:00" },
  { id: "tarde", titulo: "Tarde", desde: "13:00", hasta: "18:00" },
  { id: "jornada", titulo: "Jornada completa", desde: "08:00", hasta: "18:00" },
  { id: "todo", titulo: "24 horas", desde: "00:00", hasta: "23:59" },
];

export const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

export type PresetDeDias = { id: string; titulo: string; dias: number[] };

export const PRESETS_DE_DIAS: PresetDeDias[] = [
  { id: "semana", titulo: "Lunes a viernes", dias: [0, 1, 2, 3, 4] },
  { id: "semana-sabado", titulo: "Lunes a sábado", dias: [0, 1, 2, 3, 4, 5] },
  { id: "todos", titulo: "Todos los días", dias: [0, 1, 2, 3, 4, 5, 6] },
];

export type HorarioElegido = { dias: number[]; bloque: BloqueDeHoras | null };

export const HORARIO_INICIAL: HorarioElegido = { dias: [0, 1, 2, 3, 4], bloque: "jornada" };

/** Franjas de la API (`business_ranges`) para lo elegido; vacío = sin horario definido. */
export function franjasDeHorario(horario: HorarioElegido): Franja[] {
  const bloque = BLOQUES_DE_HORAS.find((b) => b.id === horario.bloque);
  if (!bloque) return [];
  return [...new Set(horario.dias)]
    .filter((d) => d >= 0 && d <= 6)
    .sort((a, b) => a - b)
    .map((day) => ({ day, from: bloque.desde, to: bloque.hasta }));
}

/**
 * Lo elegido a partir de las franjas guardadas, para retomar. Solo reconoce lo que el asistente
 * puede generar (un mismo bloque en varios días); un horario a medida se deja como «sin elegir».
 */
export function horarioDeFranjas(franjas: Record<string, unknown>[]): HorarioElegido | null {
  if (franjas.length === 0) return null;
  const primera = franjas[0];
  const bloque = BLOQUES_DE_HORAS.find((b) => b.desde === primera.from && b.hasta === primera.to);
  if (!bloque) return null;
  if (!franjas.every((f) => f.from === bloque.desde && f.to === bloque.hasta)) return null;
  return { dias: franjas.map((f) => Number(f.day)).filter((d) => d >= 0 && d <= 6), bloque: bloque.id };
}

/** «Lunes a viernes, 8:00 a 18:00» para la tarjeta del agente y el resumen. */
export function resumenDeHorario(horario: HorarioElegido): string {
  const bloque = BLOQUES_DE_HORAS.find((b) => b.id === horario.bloque);
  const dias = [...new Set(horario.dias)].sort((a, b) => a - b);
  if (!bloque || dias.length === 0) return "";
  const hora = (h: string) => (h === "23:59" ? "24:00" : String(Number(h.slice(0, 2))) + ":" + h.slice(3));
  const preset = PRESETS_DE_DIAS.find((p) => p.dias.length === dias.length && p.dias.every((d, i) => d === dias[i]));
  const cuando = preset
    ? preset.titulo
    : dias.length === 1
      ? DIAS[dias[0]]
      : dias.map((d) => DIAS[d]).join(", ");
  return bloque.id === "todo" ? `${cuando}, las 24 horas` : `${cuando}, ${hora(bloque.desde)} a ${hora(bloque.hasta)}`;
}

export type MotivoDeEscalar = "molesto" | "persona" | "reclamo" | "pago" | "grande";

/** Cuándo pasa a una persona: cada chip suma palabras que el cliente suele escribir. */
export const MOTIVOS_DE_ESCALAR: { id: MotivoDeEscalar; titulo: string; palabras: string[] }[] = [
  { id: "molesto", titulo: "Cliente molesto", palabras: ["molesto", "enojado", "indignado", "pésimo servicio"] },
  { id: "persona", titulo: "Pide hablar con alguien", palabras: ["asesor", "humano", "persona", "hablar con alguien"] },
  { id: "reclamo", titulo: "Reclamos", palabras: ["reclamo", "queja", "devolución", "garantía"] },
  { id: "pago", titulo: "Problemas de pago", palabras: ["me cobraron", "cobro doble", "pago no llegó", "reembolso"] },
  { id: "grande", titulo: "Pedidos grandes", palabras: ["al por mayor", "mayorista", "pedido grande", "cotización grande"] },
];

export const FRASES_SUGERIDAS_PROHIBIDAS = [
  "garantizado",
  "100% seguro",
  "gratis",
  "sin falta",
  "te lo prometo",
] as const;

export const MAX_PROHIBIDAS = 12;
export const FRASE_MAX = 60;

/** Normaliza lo que el dueño escribe como frase prohibida: sin espacios de más, sin vacíos ni repetidas. */
export function agregarFrase(actuales: string[], nueva: string): string[] {
  const limpia = nueva.trim().replace(/\s+/g, " ").slice(0, FRASE_MAX);
  if (!limpia || actuales.length >= MAX_PROHIBIDAS) return actuales;
  if (actuales.some((f) => f.toLowerCase() === limpia.toLowerCase())) return actuales;
  return [...actuales, limpia];
}

/** Palabras para la API a partir de los motivos elegidos (sin repetidas, en orden). */
export function palabrasDeEscalar(motivos: MotivoDeEscalar[]): string[] {
  const palabras = MOTIVOS_DE_ESCALAR.filter((m) => motivos.includes(m.id)).flatMap((m) => m.palabras);
  return [...new Set(palabras)];
}

/** Motivos que ya cubren las palabras guardadas (un motivo cuenta si están todas sus palabras). */
export function motivosDePalabras(palabras: string[]): MotivoDeEscalar[] {
  const guardadas = new Set(palabras.map((p) => p.toLowerCase()));
  return MOTIVOS_DE_ESCALAR.filter((m) => m.palabras.every((p) => guardadas.has(p.toLowerCase()))).map((m) => m.id);
}

// ------------------------------------------------------------------------------- el estado

export type EstadoDelAsistente = {
  tipo: TipoDeNegocio | null;
  queVende: QueVende;
  negocio: string;
  descripcion: string;
  nombreDelAgente: string;
  tono: Tono;
  calidez: number;
  emojis: Emojis;
  largo: Largo;
  horario: HorarioElegido | null;
  motivos: MotivoDeEscalar[];
  prohibidas: string[];
};

export const ESTADO_INICIAL: EstadoDelAsistente = {
  tipo: null,
  queVende: "productos",
  negocio: "",
  descripcion: "",
  nombreDelAgente: "",
  tono: "cercano",
  calidez: 4,
  emojis: "sparse",
  largo: "normal",
  horario: HORARIO_INICIAL,
  motivos: ["persona", "molesto"],
  prohibidas: ["garantizado"],
};

export const DESCRIPCION_MIN = 10;
export const DESCRIPCION_MAX = 600;
export const NOMBRE_AGENTE_MAX = 60;

/** Mensaje de error del paso, o `undefined` si se puede avanzar. Los pasos de la 3 a la 6 no bloquean aquí. */
export function errorDelPaso(id: IdDePaso, estado: EstadoDelAsistente): string | undefined {
  if (id === "negocio") {
    if (!estado.tipo) return "Elige a qué se dedica tu negocio.";
    if (estado.descripcion.trim().length < DESCRIPCION_MIN) {
      return "Cuéntanos en una frase a qué se dedica tu negocio.";
    }
    if (estado.descripcion.trim().length > DESCRIPCION_MAX) return `Máximo ${DESCRIPCION_MAX} caracteres.`;
    if (!estado.nombreDelAgente.trim()) return "Ponle un nombre a tu agente.";
    if (estado.nombreDelAgente.trim().length > NOMBRE_AGENTE_MAX) return `Máximo ${NOMBRE_AGENTE_MAX} caracteres.`;
  }
  if (id === "reglas" && estado.horario && franjasDeHorario(estado.horario).length === 0) {
    return "Elige al menos un día para el horario.";
  }
  return undefined;
}

/** Tipo de negocio → clave de plantilla de agente (SPEC-39). */
export function plantillaDe(tipo: TipoDeNegocio): string {
  return tipo;
}

/** Respuestas de `POST /admin/agents/from-script` según lo elegido. */
export function respuestasDeCreacion(estado: EstadoDelAsistente): Record<string, string> {
  return {
    largo_respuesta: estado.largo,
    ...(estado.tipo === "ventas" ? { que_vendes: estado.queVende } : {}),
  };
}

/**
 * Cambios que el asistente guarda en Configuración › Identidad. El servidor une esto con lo que ya
 * hay (`PUT /settings/identity` reemplaza todo) y siempre deja el horario como informativo: el agente
 * responde 24/7 y el horario es el de atención de tu equipo.
 */
export type CambiosDeIdentidad = Partial<
  Pick<
    IdentitySettings,
    | "assistant_name"
    | "business_description"
    | "persona_tone"
    | "persona_warmth"
    | "persona_emojis"
    | "persona_max_length"
    | "persona_forbidden"
    | "escalation_keywords"
    | "business_ranges"
    | "business_hours_mode"
  >
>;

export function cambiosDelPaso(id: IdDePaso, estado: EstadoDelAsistente): CambiosDeIdentidad {
  if (id === "negocio") {
    return {
      assistant_name: estado.nombreDelAgente.trim(),
      business_description: [estado.negocio.trim(), estado.descripcion.trim()].filter(Boolean).join(". "),
    };
  }
  if (id === "voz") {
    const largo = LARGOS.find((l) => l.id === estado.largo) ?? LARGOS[1];
    return {
      persona_tone: estado.tono,
      persona_warmth: Math.min(Math.max(estado.calidez, CALIDEZ_MIN), CALIDEZ_MAX),
      persona_emojis: estado.emojis,
      persona_max_length: largo.caracteres,
    };
  }
  if (id === "reglas") {
    return {
      business_ranges: estado.horario ? franjasDeHorario(estado.horario) : [],
      business_hours_mode: "informativo",
      escalation_keywords: palabrasDeEscalar(estado.motivos),
      persona_forbidden: estado.prohibidas,
    };
  }
  return {};
}

/** Estado inicial a partir de lo ya guardado en Identidad, para retomar el recorrido donde se quedó. */
export function estadoDesdeIdentidad(identidad: IdentitySettings, base: EstadoDelAsistente = ESTADO_INICIAL): EstadoDelAsistente {
  const tono = TONOS.find((t) => t.id === identidad.persona_tone)?.id ?? base.tono;
  const emojis = EMOJIS.find((e) => e.id === identidad.persona_emojis)?.id ?? base.emojis;
  const largo = LARGOS.find((l) => l.caracteres === identidad.persona_max_length)?.id ?? base.largo;
  const horario = horarioDeFranjas(identidad.business_ranges) ?? (identidad.business_ranges.length ? null : base.horario);
  const motivos = identidad.escalation_keywords.length ? motivosDePalabras(identidad.escalation_keywords) : base.motivos;
  return {
    ...base,
    nombreDelAgente: identidad.assistant_name?.trim() && identidad.assistant_name !== "Asistente" ? identidad.assistant_name : base.nombreDelAgente,
    descripcion: identidad.business_description?.trim() ? identidad.business_description : base.descripcion,
    tono,
    emojis,
    largo,
    calidez: identidad.persona_warmth >= CALIDEZ_MIN && identidad.persona_warmth <= CALIDEZ_MAX ? identidad.persona_warmth : base.calidez,
    horario,
    motivos,
    prohibidas: identidad.persona_forbidden.length ? identidad.persona_forbidden : base.prohibidas,
  };
}

// ------------------------------------------------------------------------ aviso y progreso

/** Pasos que faltan para terminar, para el texto del aviso. */
export function pasosQueFaltan(recorrido: Recorrido): number {
  if (recorrido.estado === "completo" || !recorrido.aplica) return 0;
  return Math.max(TOTAL_PASOS - Math.max(recorrido.paso - 1, 0), 1);
}

export function textoDelAviso(recorrido: Recorrido): string {
  const faltan = pasosQueFaltan(recorrido);
  return faltan === 1
    ? "Tu agente aún no está listo para probar. Falta 1 paso."
    : `Tu agente aún no está listo para probar. Faltan ${faltan} pasos.`;
}

export function textoDeAvance(paso: number): string {
  return `Paso ${paso} de ${TOTAL_PASOS}`;
}

/** Texto del botón del aviso: retomar si ya había empezado, empezar si no. */
export function accionDelAviso(recorrido: Recorrido): string {
  return recorrido.paso > 1 || recorrido.estado === "en_curso" ? "Continuar" : "Empezar";
}

// ---------------------------------------------------------------------------- dejar listo

export type SubPaso = { clave: "conexion" | "publicar" | "activar"; estado: "hecho" | "ya_estaba" | "pendiente_de_revision" };

export const ETIQUETAS_DE_SUBPASO: Record<SubPaso["clave"], string> = {
  conexion: "Preparar un chat de pruebas",
  publicar: "Publicar tu agente ahí",
  activar: "Dejarlo activo",
};

/** Frases sugeridas para el chat de prueba, según el tipo de negocio. */
export const FRASES_DE_PRUEBA: Record<TipoDeNegocio, string[]> = {
  ventas: ["Hola, ¿qué venden?", "¿Cuánto cuesta y cómo puedo pagar?", "Quiero hacer un pedido"],
  agenda: ["Hola, quiero agendar una cita", "¿Qué horarios tienen disponibles?", "Necesito cancelar mi cita"],
  cobranza: ["Hola, ¿cuánto debo?", "No puedo pagar esta semana", "¿Cómo pago mi cuota?"],
  suscripciones: ["Hola, quiero cambiar mi plan", "¿Cuándo es mi próximo cobro?", "Quiero cancelar mi suscripción"],
};
