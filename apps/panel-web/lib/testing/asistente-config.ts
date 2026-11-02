import type { CatalogoConfig, GuionAsistente, OpcionConfig, PropuestaAsistente } from "@/lib/api/types";

/** Guiones y catálogo de prueba del asistente de Configuración (misma forma que sirve el backend). */

const franjas = (dias: number[], desde: string, hasta: string) => dias.map((day) => ({ day, from: desde, to: hasta }));

export const GUION_VOZ: GuionAsistente = {
  seccion: "voz",
  titulo: "Cómo habla tu asistente",
  ayuda: "Preguntas para dejar el tono y el largo.",
  preguntas: [
    {
      id: "tono",
      titulo: "¿Cómo quieres que suene?",
      ayuda: "Es la forma de hablar con tus clientes.",
      tipo: "una",
      opciones: [
        { id: "cercano", titulo: "Cercano", ayuda: "«¡Hola! Cuéntame, ¿en qué te ayudo?»", cambios: { persona_tone: "cercano", persona_warmth: 4 } },
        { id: "profesional", titulo: "Profesional", ayuda: "«Buenas tardes. ¿En qué puedo ayudarle?»", cambios: { persona_tone: "formal", persona_warmth: 3 } },
      ],
    },
    {
      id: "prohibidas",
      titulo: "¿Hay frases que nunca debe decir?",
      ayuda: "Las frases que ya agregaste tú a mano se conservan.",
      tipo: "varias",
      opciones: [
        { id: "garantizado", titulo: "«garantizado»", ayuda: "", cambios: { persona_forbidden: ["garantizado"] } },
        { id: "gratis", titulo: "«gratis»", ayuda: "", cambios: { persona_forbidden: ["gratis"] } },
      ],
    },
  ],
};

export const GUION_ATENCION: GuionAsistente = {
  seccion: "atencion",
  titulo: "Cuándo y cómo atiende",
  ayuda: "",
  preguntas: [
    {
      id: "horario",
      titulo: "¿Cuándo atiende tu equipo?",
      ayuda: "",
      tipo: "una",
      opciones: [
        { id: "semana", titulo: "Lunes a viernes, 8:00 a 18:00", ayuda: "", cambios: { business_ranges: franjas([0, 1, 2, 3, 4], "08:00", "18:00") } },
        { id: "siempre", titulo: "Siempre, sin horario", ayuda: "El asistente responde a toda hora.", cambios: { business_ranges: [] } },
      ],
    },
    {
      id: "fuera_de_horario",
      titulo: "¿Qué hace cuando escriben fuera de horario?",
      ayuda: "Solo aplica si definiste un horario.",
      tipo: "una",
      opciones: [
        { id: "responde", titulo: "Responde igual", ayuda: "", cambios: { business_hours_mode: "informativo" } },
        { id: "avisa", titulo: "Avisa y deja la conversación para después", ayuda: "", cambios: { business_hours_mode: "bloquea", out_of_hours_message: "" } },
      ],
    },
  ],
};

const opcion = (clave: string, grupo: OpcionConfig["grupo"], tipo: OpcionConfig["tipo"], etiqueta: string, extra: Partial<OpcionConfig> = {}): OpcionConfig => ({
  clave,
  grupo,
  tipo,
  etiqueta,
  explicacion: `Ayuda de ${etiqueta}.`,
  ejemplo: "",
  unidad: "",
  editable_por: "dueno",
  solo_lectura: false,
  almacen: "app_settings",
  ambito: "negocio",
  ...extra,
});

export const OPCIONES_DEL_ASISTENTE: OpcionConfig[] = [
  opcion("persona_tone", "voz", "elegir_una", "Tono", {
    valores: [
      { valor: "cercano", etiqueta: "Cercano", nota: "" },
      { valor: "formal", etiqueta: "Formal", nota: "" },
    ],
  }),
  opcion("persona_warmth", "voz", "entero", "Calidez", { minimo: 1, maximo: 5, unidad: "puntos" }),
  opcion("persona_forbidden", "voz", "lista_de_textos", "Frases prohibidas"),
  opcion("business_ranges", "horario", "franjas", "Horario de atención"),
  opcion("business_hours_mode", "horario", "elegir_una", "Fuera de horario", {
    valores: [
      { valor: "informativo", etiqueta: "Responde igual", nota: "" },
      { valor: "bloquea", etiqueta: "Avisa y espera", nota: "" },
    ],
  }),
  opcion("out_of_hours_message", "horario", "texto_largo", "Mensaje fuera de horario"),
];

export const CATALOGO_CON_ASISTENTE: CatalogoConfig = {
  aos_runtime: "legacy",
  version: "asistente",
  opciones: OPCIONES_DEL_ASISTENTE,
  asistente: [GUION_VOZ, GUION_ATENCION],
};

/** Vista previa de la voz: un cambio hecho a mano, uno nuevo y uno omitido. */
export const PROPUESTA_DE_VOZ: PropuestaAsistente = {
  seccion: "voz",
  cambios: [
    { clave: "persona_tone", etiqueta: "Tono", actual: "formal", propuesto: "cercano", editado_a_mano: true },
    { clave: "persona_warmth", etiqueta: "Calidez", actual: 3, propuesto: 4, editado_a_mano: false },
  ],
  omitidos: [{ clave: "persona_forbidden", etiqueta: "Frases prohibidas", motivo: "La voz de este negocio se cambia al publicar una versión del agente, no desde aquí." }],
  huella: "huella-1",
};

export const PROPUESTA_DE_ATENCION: PropuestaAsistente = {
  seccion: "atencion",
  cambios: [
    { clave: "business_ranges", etiqueta: "Horario de atención", actual: [], propuesto: franjas([0, 1, 2, 3, 4], "08:00", "18:00"), editado_a_mano: false },
    { clave: "business_hours_mode", etiqueta: "Fuera de horario", actual: "informativo", propuesto: "bloquea", editado_a_mano: false },
    { clave: "out_of_hours_message", etiqueta: "Mensaje fuera de horario", actual: "Volvemos mañana.", propuesto: "", editado_a_mano: true },
  ],
  omitidos: [],
  huella: "huella-2",
};

/**
 * Catálogo completo de la pantalla de Identidad con el guion del asistente: lo sirve el backend de prueba y
 * lo usa el gate de accesibilidad de las páginas (el catálogo sin `asistente` es el de un backend viejo).
 */
const si = (valor: string, etiqueta: string, nota = "") => ({ valor, etiqueta, nota });
export const CATALOGO_DE_PRUEBA: CatalogoConfig = {
  aos_runtime: "legacy",
  version: "prueba-asistente",
  opciones: [
    opcion("assistant_name", "identidad", "texto", "Nombre del asistente"),
    opcion("business_description", "identidad", "texto_largo", "Descripción del negocio"),
    opcion("currency", "identidad", "texto", "Moneda"),
    opcion("persona_tone", "voz", "elegir_una", "Tono", {
      almacen: "spec:persona.tone",
      valores: [si("cercano", "Cercano"), si("formal", "Formal"), si("neutral", "Neutral"), si("informal", "Informal")],
    }),
    opcion("persona_warmth", "voz", "entero", "Calidez", { almacen: "spec:persona.warmth", minimo: 1, maximo: 5, unidad: "puntos" }),
    opcion("persona_emojis", "voz", "elegir_una", "Emojis", {
      almacen: "spec:persona.emojis",
      valores: [si("none", "Ninguno"), si("sparse", "Pocos"), si("free", "Muchos")],
    }),
    opcion("persona_max_length", "voz", "entero", "Largo máximo de la respuesta", { almacen: "spec:persona.maxLength", minimo: 100, maximo: 2000, unidad: "caracteres" }),
    opcion("persona_forbidden", "voz", "lista_de_textos", "Frases prohibidas", { almacen: "spec:persona.forbiddenPhrases" }),
    opcion("debounce_mode", "respuesta", "elegir_una", "Velocidad de respuesta", {
      valores: [si("rapido", "Rápido", "espera 8 s"), si("natural", "Natural", "espera 15 s"), si("pausado", "Pausado", "espera 30 s")],
    }),
    opcion("split_style", "respuesta", "elegir_una", "Estilo de envío", {
      valores: [si("un_mensaje", "Un solo mensaje"), si("pocos_cortos", "Pocos mensajes cortos")],
    }),
    opcion("guardrail_max_retries", "calidad", "entero", "Reintentos", { minimo: 0, maximo: 3 }),
    opcion("escalation_keywords", "escalamiento", "lista_de_textos", "Palabras que pasan a una persona"),
    opcion("auto_escalate_after_turns", "escalamiento", "entero", "Pasar a una persona tras", { minimo: 0, maximo: 50, unidad: "turnos" }),
    opcion("business_ranges", "horario", "franjas", "Horario de atención"),
    opcion("business_hours_mode", "horario", "elegir_una", "Fuera de horario", {
      valores: [si("informativo", "Responde igual"), si("bloquea", "Avisa y espera")],
    }),
    opcion("out_of_hours_message", "horario", "texto_largo", "Mensaje fuera de horario", {
      depende_de: { clave: "business_ranges", condicion: "no_vacia", motivo: "Sin horario de atención este mensaje no se usa." },
    }),
  ],
  asistente: [
    {
      ...GUION_VOZ,
      preguntas: [
        GUION_VOZ.preguntas[0],
        {
          id: "emojis",
          titulo: "¿Usa emojis?",
          ayuda: "",
          tipo: "una",
          opciones: [
            { id: "ninguno", titulo: "Ninguno", ayuda: "Nunca usa emojis.", cambios: { persona_emojis: "none" } },
            { id: "pocos", titulo: "Pocos", ayuda: "Alguno de vez en cuando.", cambios: { persona_emojis: "sparse" } },
            { id: "muchos", titulo: "Muchos", ayuda: "Los usa con naturalidad.", cambios: { persona_emojis: "free" } },
          ],
        },
        {
          id: "largo",
          titulo: "¿Qué tan largas deben ser sus respuestas?",
          ayuda: "Las respuestas largas se parten en pocos mensajes para que se lean bien en el celular.",
          tipo: "una",
          opciones: [
            { id: "cortas", titulo: "Cortas", ayuda: "Directas, hasta unos 300 caracteres.", cambios: { persona_max_length: 300, split_style: "un_mensaje" } },
            { id: "detalladas", titulo: "Detalladas", ayuda: "Hasta unos 900 caracteres, en pocos mensajes.", cambios: { persona_max_length: 900, split_style: "pocos_cortos" } },
          ],
        },
        GUION_VOZ.preguntas[1],
      ],
    },
    {
      ...GUION_ATENCION,
      preguntas: [
        GUION_ATENCION.preguntas[0],
        GUION_ATENCION.preguntas[1],
        {
          id: "escalar_turnos",
          titulo: "Si no logra resolver una conversación, ¿pasa a una persona?",
          ayuda: "",
          tipo: "una",
          opciones: [
            { id: "nunca", titulo: "Solo si el cliente lo pide", ayuda: "", cambios: { auto_escalate_after_turns: 0 } },
            { id: "cinco", titulo: "Después de 5 turnos sin resolver", ayuda: "", cambios: { auto_escalate_after_turns: 5 } },
          ],
        },
      ],
    },
  ],
};
