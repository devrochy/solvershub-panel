/**
 * Asistente de primer uso (HU-UX-21, SPEC-41). Lógica pura: pasos, decisiones visuales y su traducción a
 * lo que guarda la API. El estado del recorrido y que esté «completo» los decide el servidor
 * (`/admin/onboarding`); aquí solo se arma lo que el dueño elige con clics.
 */
import { CalendarCheck, HandCoins, Repeat, ShoppingBag, type LucideIcon } from "lucide-react";

import type { IdentitySettings, PrimerosPasos } from "@/lib/api/types";
import type { Franja } from "@/lib/horario-atencion";

export type Recorrido = PrimerosPasos["recorrido"];

/**
 * La bienvenida es la ruta de lanzamiento de 5 estaciones (SPEC-49, HU-UX-25, D-77): 1 Tu negocio (vive en
 * `/bienvenida` y escribe en la identidad del negocio; al salir se crea el agente), 2 Habilidades, 3 Datos del
 * cliente, 4 Datos para probar y 5 Revisar y publicar (el editor a pantalla completa, `/bienvenida/agente/[id]`).
 * Cómo habla y el horario quedan con lo sugerido y se ajustan en Personalizar. Antes fueron 4 (HU-AOS-81), 9
 * (HU-UX-23) y 6 (la APK): el servidor traduce lo guardado al leerlo (HU-AOS-84) y `pasoDeCinco` repite esa
 * traducción por si llega un recorrido con otra escala.
 */
export const TOTAL_PASOS = 5;

export const PASOS = [
  { id: "negocio", titulo: "Cuéntanos de tu negocio", corto: "Tu negocio" },
  { id: "habilidades", titulo: "¿Qué sabe hacer tu agente?", corto: "Habilidades" },
  { id: "datos-cliente", titulo: "¿Qué datos pide tu agente?", corto: "Datos del cliente" },
  { id: "conocimiento", titulo: "Datos para probar", corto: "Datos para probar" },
  { id: "probar", titulo: "Revisar y publicar", corto: "Revisar y publicar" },
] as const;

/** Los pasos que viven en `/bienvenida` (escriben en el negocio); del 2 en adelante va el editor del agente. */
export const PASOS_DEL_NEGOCIO = 1;

/** Lo que pide el paso 1: los datos del negocio y la identidad del agente (antes, dos pasos). */
export const PARTES_DEL_PASO_1 = ["negocio", "identidad"] as const;

export type IdDePaso = (typeof PASOS)[number]["id"] | "identidad" | "voz" | "reglas";

/** Los pasos del editor del agente en la bienvenida (estaciones 2 a 5). */
export type PasoDelEditorEnLaBienvenida = Exclude<(typeof PASOS)[number]["id"], "negocio">;

/** Cómo se traduce un paso guardado con 4 (HU-AOS-81) a la escala de 5: «Datos para probar» era el 3. */
export const PASO_DE_4_A_5: Readonly<Record<number, number>> = { 1: 1, 2: 2, 3: 4, 4: 5 };
/** De 9 (HU-UX-23) a 4; de ahí, a 5 con `PASO_DE_4_A_5`. */
const PASO_DE_9_A_4: Readonly<Record<number, number>> = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 2, 6: 2, 7: 3, 8: 4, 9: 4 };

/**
 * El paso del recorrido en la escala de 5 (1 a 5). El servidor ya lo traduce (HU-AOS-84) y manda
 * `total_pasos: 5`; si llega uno guardado con 4 o con 9, se traduce igual que allá.
 */
export function pasoDeCinco(recorrido: Pick<Recorrido, "paso" | "total_pasos">): number {
  const paso = Math.max(Math.trunc(recorrido.paso) || 1, 1);
  if (recorrido.total_pasos === 4) return PASO_DE_4_A_5[Math.min(paso, 4)];
  if (recorrido.total_pasos === 9) return PASO_DE_4_A_5[PASO_DE_9_A_4[Math.min(paso, 9)]];
  return Math.min(paso, TOTAL_PASOS);
}

/** La estación del editor con la que se retoma: antes de la 2 se empieza por «Habilidades». */
export function pasoDelEditorEnLaBienvenida(recorrido: Pick<Recorrido, "paso" | "total_pasos">): PasoDelEditorEnLaBienvenida {
  const paso = Math.max(pasoDeCinco(recorrido), PASOS_DEL_NEGOCIO + 1);
  return PASOS[paso - 1].id as PasoDelEditorEnLaBienvenida;
}

// --------------------------------------------------------------------------- tipo de negocio

export type TipoDeNegocio = "ventas" | "agenda" | "cobranza" | "suscripciones";

/** El tipo que viene elegido en la bienvenida, con la etiqueta «Recomendado» (D-SPEC-49-5). */
export const TIPO_RECOMENDADO: TipoDeNegocio = "ventas";

/** El nombre sugerido de la bienvenida para cualquier tipo (D-SPEC-49-6); las ideas salen de la lista del tipo. */
export const NOMBRE_SUGERIDO_DE_LA_BIENVENIDA = "Laura";

export const TIPOS_DE_NEGOCIO: {
  id: TipoDeNegocio;
  titulo: string;
  /** Ayuda corta, de una línea, bajo el título de la tarjeta. */
  ayuda: string;
  icono: LucideIcon;
  /**
   * Frase sugerida para «Cuéntanos en una frase a qué se dedica». Es genérica: nunca un dato inventado del
   * negocio (zona, productos o precios). Se reemplaza al cambiar de tipo solo si el dueño no la editó.
   */
  frase: string;
  /** Tipo de contenido del paso «Qué sabe» (`CONTENIDO` de primeros-pasos). */
  contenido: "catalogo" | "servicios" | "cartera" | null;
  nombres: string[];
}[] = [
  {
    id: "ventas",
    titulo: "Vendo productos",
    ayuda: "Cotiza y toma el pedido.",
    icono: ShoppingBag,
    frase: "Vendemos nuestros productos por WhatsApp y tomamos pedidos para recoger o a domicilio.",
    contenido: "catalogo",
    nombres: ["Sofía", "Vera", "Mateo"],
  },
  {
    id: "agenda",
    titulo: "Agendo citas",
    ayuda: "Ofrece horarios y reserva.",
    icono: CalendarCheck,
    frase: "Atendemos con cita previa y agendamos, cambiamos o cancelamos citas por WhatsApp.",
    contenido: "servicios",
    nombres: ["Tomás", "Luna", "Dani"],
  },
  {
    id: "cobranza",
    titulo: "Cobro cartera",
    ayuda: "Recuerda pagos y promesas.",
    icono: HandCoins,
    frase: "Damos crédito a nuestros clientes y les recordamos sus pagos por WhatsApp.",
    contenido: "cartera",
    nombres: ["Clara", "Cobros", "Nico"],
  },
  {
    id: "suscripciones",
    titulo: "Vendo y gestiono planes",
    ayuda: "Contrata planes y atiende.",
    icono: Repeat,
    frase: "Ofrecemos planes con pago periódico y atendemos a nuestros suscriptores por WhatsApp.",
    contenido: null,
    nombres: ["Alma", "Planes", "Leo"],
  },
];

/** Ideas de nombre de la bienvenida: «Laura» primero y luego las del tipo, sin nombres de función. */
export function ideasDeLaBienvenida(tipo: TipoDeNegocio | null, cuantas = 4): string[] {
  const funciones = new Set(["Agenda", "Cobros", "Planes"]);
  const delTipo = TIPOS_DE_NEGOCIO.find((t) => t.id === tipo)?.nombres ?? [];
  return [...new Set([NOMBRE_SUGERIDO_DE_LA_BIENVENIDA, ...delTipo])].filter((n) => !funciones.has(n)).slice(0, cuantas);
}

/** La frase sugerida del tipo (vacía si no hay tipo). */
export function fraseDelTipo(tipo: TipoDeNegocio | null): string {
  return TIPOS_DE_NEGOCIO.find((t) => t.id === tipo)?.frase ?? "";
}

/**
 * Elige un tipo de negocio. La frase sigue al tipo mientras el dueño no la haya editado (vacía o igual a la
 * sugerida del tipo anterior); lo escrito por él se respeta.
 */
export function conTipo(estado: EstadoDelAsistente, tipo: TipoDeNegocio): EstadoDelAsistente {
  const sinEditar = estado.descripcion.trim() === "" || estado.descripcion === fraseDelTipo(estado.tipo);
  return { ...estado, tipo, descripcion: sinEditar ? fraseDelTipo(tipo) : estado.descripcion };
}

/** El estado con lo recomendado por SolversHub en la estación 1 (tipo, nombre y frase), sin tocar el negocio. */
export function conLoRecomendado(estado: EstadoDelAsistente, tipo: TipoDeNegocio = TIPO_RECOMENDADO): EstadoDelAsistente {
  return { ...estado, tipo, nombreDelAgente: NOMBRE_SUGERIDO_DE_LA_BIENVENIDA, descripcion: fraseDelTipo(tipo) };
}

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

export const CALIDEZ_MIN = 0;
export const CALIDEZ_MAX = 5;
export const CALIDEZ_ETIQUETAS = ["Seco", "Sobrio", "Reservado", "Amable", "Cálido", "Muy cálido"] as const;

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
  const calidez: Record<number, string> = {
    0: "Vamos al punto.",
    1: "Claro.",
    2: "Entiendo.",
    3: "Claro, te ayudo.",
    4: "Con gusto te ayudo, cuéntame.",
    5: "¡Me encanta poder ayudarte!",
  };
  const detalle =
    voz.largo === "detalladas"
      ? "Puedo contarte los detalles, los precios y los horarios, y dejar todo listo por aquí mismo."
      : "";
  const emoji = voz.emojis === "none" ? "" : voz.emojis === "free" ? " 😊✨" : " 🙂";
  const partes =
    voz.largo === "cortas"
      ? [saludo[voz.tono], calidez[voz.calidez] ?? "", ofrece[voz.tono]]
      : [saludo[voz.tono], presenta, calidez[voz.calidez] ?? "", detalle, ofrece[voz.tono]];
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

/** Llega con lo recomendado por SolversHub (HU-UX-25): «Vendo productos», «Laura» y la frase del tipo. */
export const ESTADO_INICIAL: EstadoDelAsistente = {
  tipo: TIPO_RECOMENDADO,
  negocio: "",
  descripcion: TIPOS_DE_NEGOCIO.find((t) => t.id === TIPO_RECOMENDADO)?.frase ?? "",
  nombreDelAgente: NOMBRE_SUGERIDO_DE_LA_BIENVENIDA,
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
    if (!estado.negocio.trim()) return "Escribe cómo se llama tu negocio.";
    if (estado.descripcion.trim().length < DESCRIPCION_MIN) {
      return "Cuéntanos en una frase a qué se dedica tu negocio.";
    }
    if (estado.descripcion.trim().length > DESCRIPCION_MAX) return `Máximo ${DESCRIPCION_MAX} caracteres.`;
  }
  if (id === "identidad") {
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

/**
 * Respuestas de `POST /admin/agents/from-script` según lo elegido. Ventas ya no pregunta qué vende
 * (SPEC-43, HU-COM-17): toma pedidos de productos, y los planes son del agente de Suscripciones.
 */
export function respuestasDeCreacion(estado: EstadoDelAsistente): Record<string, string> {
  return { largo_respuesta: estado.largo };
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
      business_description: [estado.negocio.trim(), estado.descripcion.trim()].filter(Boolean).join(". "),
    };
  }
  if (id === "identidad") {
    return { assistant_name: estado.nombreDelAgente.trim() };
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

/** Estaciones que faltan para terminar (de 5), para el texto del aviso. */
export function pasosQueFaltan(recorrido: Recorrido): number {
  if (recorrido.estado === "completo" || !recorrido.aplica) return 0;
  return Math.max(TOTAL_PASOS - Math.max(pasoDeCinco(recorrido) - 1, 0), 1);
}

/** El aviso persistente cuenta las estaciones que faltan de 5. */
export function textoDelAviso(recorrido: Recorrido): string {
  const faltan = pasosQueFaltan(recorrido);
  return faltan === 1
    ? `Tu agente aún no está listo para responder. Falta 1 de ${TOTAL_PASOS} pasos.`
    : `Tu agente aún no está listo para responder. Faltan ${faltan} de ${TOTAL_PASOS} pasos.`;
}

export function textoDeAvance(paso: number): string {
  return `Paso ${paso} de ${TOTAL_PASOS}`;
}

/** «Seguir después» (HU-UX-25): la confirmación dice qué pasa y que lo hecho no se pierde. */
export function textosDeSeguirDespues(nombreDelAgente: string): { titulo: string; detalle: string } {
  return {
    titulo: `${nombreDelAgente.trim() || "Tu agente"} no atiende hasta que termines.`,
    detalle: "Lo que llevas queda guardado y retomas aquí desde Inicio.",
  };
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
  suscripciones: ["Hola, ¿qué planes tienen?", "Quiero cambiar mi plan", "¿Cuándo es mi próximo cobro?"],
};
