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
    what: "La foto del negocio: cifras clave, actividad de cada agente y consumo, en 7, 15 o 30 días.",
    first: [
      "Cambia la ventana (7, 15 o 30 días) para leer la tendencia.",
      "Toca cualquier cifra o agente para abrir su detalle.",
      "Revisa las conversaciones sin responder y confirma que el asistente está activo.",
    ],
  },
  conversations: {
    question: "¿Qué son las Conversaciones?",
    what: "Cada chat entre tu asistente y un cliente. Aquí ves lo que se dijo y puedes tomar el control.",
    first: ["Abre una conversación para leer el contexto.", "Toma el control si necesitas responder tú."],
  },
  tenants: {
    question: "¿Qué es Negocios?",
    what: "Todos los negocios de la plataforma, con su estado y su plan. Abre uno para cambiar su plan, reenviar el acceso al dueño, encender funciones o ver cómo atiende su asistente.",
    first: ["Busca por nombre o slug: la lista filtra mientras escribes.", "Abre un negocio para gestionarlo; eliminarlo pide una frase de confirmación."],
  },
  alta_automatica: {
    question: "¿Qué es el alta automática?",
    what: "La configuración propia del agente de ventas de SolversHub: cuando un cliente compra un plan por WhatsApp, el agente crea su negocio solo. No es una función de los negocios.",
    first: ["Revisa las altas que quedaron frenadas: apruébalas o descártalas.", "Publica los documentos que acepta el cliente; mientras falte uno, toda alta queda en revisión.", "Pausa el alta automática ante un ataque."],
  },
  meta_app: {
    question: "¿Qué es la app de Meta?",
    what: "Los chequeos de la app de Meta de la plataforma y de la infraestructura que la sostiene. Corren en segundo plano y queda guardado el último resultado.",
    first: ["Arregla primero lo que aparece arriba: cada punto dice cómo.", "Revisa los requisitos de Embedded Signup antes de ofrecerlo a los negocios."],
  },
  crons: {
    question: "¿Qué son los crons?",
    what: "Las tareas periódicas de la plataforma por módulo: si corren a tiempo, qué falló y cómo operarlas.",
    first: ["Mira primero los atrasados y los que fallaron.", "Los que tocan clientes cobran o escriben de verdad: cámbialos con cuidado."],
  },
  agents: {
    question: "¿Qué son los Agentes?",
    what: "Cada agente que atiende tu negocio (Ventas, Agenda, Cobranza…) y lo que construyó: conversaciones, tareas, clientes, registros y consumo.",
    first: [
      "Abre un agente para ver lo que hizo en el período.",
      "Revisa su consumo para saber qué te está rindiendo.",
    ],
  },
  escalations: {
    question: "¿Qué son las Escalaciones?",
    what: "Los casos que el asistente pasó a una persona: quejas, temas delicados o cuando el cliente lo pidió.",
    first: ["Atiende primero las más antiguas.", "Revisa por qué se escaló para mejorar la guía."],
  },
  leads: {
    question: "¿Qué son los Clientes?",
    what: "Las personas que te escribieron o dejaron sus datos. Es tu lista de oportunidades para vender.",
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
    question: "¿Qué es Equipo?",
    what: "Las personas de tu equipo que entran al panel, y qué puede hacer cada una.",
    first: ["Invita a tu equipo.", "Define su rol para darle el acceso justo."],
  },
  settings: {
    question: "¿Qué es Configuración?",
    what: "Cómo se presenta y cómo responde el asistente: nombre, voz, horario y reglas. Está ordenado por tareas en el menú de la izquierda.",
    first: ["Revisa la voz en «Voz y estilo».", "Confirma la moneda de tu negocio en «Identidad»."],
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
  subscriptions: {
    question: "¿Qué son las Suscripciones?",
    what: "Los clientes que pagan un plan cada periodo: a quién le cobras, cuánto debe cada uno y qué pagos están pendientes.",
    first: [
      "Mira primero a quienes están en mora.",
      "Abre una suscripción para pausarla, reanudarla o reenviar el link de pago.",
      "Revisa el resumen para ver tu ingreso mensual recurrente.",
    ],
  },
  plantillas_opciones: {
    question: "¿Qué son las plantillas con opciones?",
    what: "Mensajes con botones: cada opción hace algo por ti cuando el cliente la toca (confirmar una cita, pedir un link de pago…), sin esperar al asistente.",
    first: [
      "Crea una plantilla y escribe el mensaje.",
      "Agrega las opciones y elige qué hace cada una.",
      "Mira la vista previa, publícala y envía una prueba a un cliente.",
      "Para escribir también fuera de las 24 horas, publica la versión en Meta y espera su aprobación.",
    ],
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

/** Enlace «Documentación» de la tarjeta del usuario (se muestra solo si hay `WIKI_URL`). */
export const DOCUMENTACION = {
  etiqueta: "Documentación",
  avisoNuevaPestana: "se abre en una pestaña nueva",
} as const;

/** Enlaces de observabilidad de la tarjeta del usuario (solo master, si hay `GRAFANA_URL`/`KIBANA_URL`). */
export const OBSERVABILIDAD = {
  grafana: "Observabilidad (Grafana)",
  kibana: "Logs (Kibana)",
} as const;
