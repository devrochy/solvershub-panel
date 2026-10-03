/**
 * Ayuda en contexto del panel (HU-UX-03): qué es cada sección y qué hacer
 * primero, en lenguaje de negocio (glosario del manual de marca §9.3), sin
 * jerga técnica.
 */

export type SectionHelp = {
  /** Pregunta que abre el modal. */
  question: string;
  /** Para qué sirve la sección, en 1-2 frases. */
  what: string;
  /** Qué hacer primero. */
  first: string[];
};

export const SECTION_HELP: Record<string, SectionHelp> = {
  dashboard: {
    question: "¿Qué es el Resumen?",
    what: "Es la foto del día: cuántas conversaciones hubo, cuántas escalaron y cómo va el consumo.",
    first: ["Revisa las conversaciones sin responder.", "Confirma que tu asistente está activo."],
  },
  conversations: {
    question: "¿Qué son las Conversaciones?",
    what: "Cada chat entre tu asistente y un cliente. Aquí ves lo que se dijo y puedes tomar el control.",
    first: ["Abre una conversación para leer el contexto.", "Toma el control si necesitas responder tú."],
  },
  escalations: {
    question: "¿Qué son las Escalaciones?",
    what: "Los casos que el asistente pasó a una persona: quejas, temas delicados o cuando el cliente lo pidió.",
    first: ["Atiende primero las más antiguas.", "Revisa por qué se escaló para mejorar la guía."],
  },
  leads: {
    question: "¿Qué son los Leads?",
    what: "Personas interesadas que dejaron sus datos. Es tu lista de oportunidades para vender.",
    first: ["Contacta los nuevos.", "Marca su estado para no perderles la pista."],
  },
  connections: {
    question: "¿Qué son las Conexiones?",
    what: "Los canales por los que tu asistente atiende (tu WhatsApp, correo, agenda).",
    first: ["Conecta tu WhatsApp.", "Verifica que aparezca como conectado."],
  },
  plugins: {
    question: "¿Qué son las Habilidades?",
    what: "Lo que tu asistente sabe hacer: vender, cobrar, agendar, responder. Se activan y configuran aquí.",
    first: ["Activa las que uses.", "Configura cada una con su guía."],
  },
  collaborators: {
    question: "¿Qué son los Colaboradores?",
    what: "Las personas de tu equipo que entran al panel, y qué puede hacer cada una.",
    first: ["Invita a tu equipo.", "Define su rol para darle el acceso justo."],
  },
  settings: {
    question: "¿Qué es Configuración?",
    what: "La identidad y el comportamiento del asistente: nombre, tono, moneda y reglas.",
    first: ["Revisa el tono.", "Confirma la moneda de tu negocio."],
  },
  costs: {
    question: "¿Qué son los Costos LLM?",
    what: "Lo que cuesta la tecnología que usa tu asistente (el motor de IA), en dólares de proveedor.",
    first: ["Revisa el costo de los últimos 30 días.", "Ajusta el modelo si quieres gastar menos."],
  },
  plan: {
    question: "¿Qué es Plan y consumo?",
    what: "Tu plan, los créditos que te quedan y lo que has usado en el período.",
    first: ["Mira tu saldo.", "Sube de plan o recarga si te estás quedando corto."],
  },
  tools: {
    question: "¿Qué son las Herramientas?",
    what: "Diagnóstico y pruebas: probar el asistente, ver fallos y revisar requisitos de WhatsApp.",
    first: ["Prueba tu asistente antes de publicar.", "Revisa la bandeja de fallos si algo no llegó."],
  },
};

export function sectionHelp(section: string): SectionHelp | undefined {
  return SECTION_HELP[section];
}
