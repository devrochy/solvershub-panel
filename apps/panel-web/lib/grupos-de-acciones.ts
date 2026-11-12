/**
 * Grupos y nombres legibles de las acciones de un agente (fase 5a de la SPEC «habilidades por agente»,
 * ADR-0190).
 *
 * El grupo lo manda la API (`group` de `GET /admin/agents/{id}/actions`, agent-core#746) y aquí solo se le
 * pone título y descripción, con los mismos textos que la APK. El mapa por nombre queda para el nombre
 * legible de cada acción y como respaldo del grupo cuando la API no lo trae: las acciones del core
 * (pasar a una persona, el perfil del cliente…) no vienen en esa lista, ni nada si la API no responde.
 */
import { humanizar } from "@/lib/turno";

export type GrupoDeAcciones = { id: string; titulo: string; descripcion: string };

/** En el orden en que se muestran. «Otras acciones» va siempre al final: nada se queda sin mostrar. */
export const GRUPOS_DE_ACCIONES: GrupoDeAcciones[] = [
  { id: "pedidos", titulo: "Pedidos", descripcion: "Crear y seguir los pedidos de tus clientes." },
  { id: "cotizaciones", titulo: "Cotizaciones", descripcion: "Preparar y confirmar cotizaciones." },
  { id: "catalogo", titulo: "Catálogo", descripcion: "Consultar productos, recomendarlos y aplicar promociones." },
  { id: "citas", titulo: "Citas", descripcion: "Agendar, mover y cancelar citas en tus agendas." },
  { id: "disponibilidad", titulo: "Disponibilidad", descripcion: "Consultar horarios libres, agendas y tipos de cita." },
  { id: "cartera", titulo: "Cartera", descripcion: "Saldos, abonos y estados de cuenta." },
  { id: "promesas", titulo: "Promesas de pago", descripcion: "Negociar y registrar promesas de pago." },
  { id: "suscripciones", titulo: "Suscripciones", descripcion: "Planes, inscripciones, pausas y cancelaciones." },
  { id: "pagos", titulo: "Pagos", descripcion: "Enlaces de pago y confirmación de pagos." },
  { id: "leads", titulo: "Leads", descripcion: "Registrar y calificar a quien pregunta por primera vez." },
  { id: "clientes", titulo: "Clientes", descripcion: "Lo que el agente sabe y recuerda de cada cliente." },
  { id: "conversacion", titulo: "Conversación", descripcion: "Pasar a una persona, dejar notas y enviar mensajes." },
  { id: "conocimiento", titulo: "Conocimiento", descripcion: "Buscar en los documentos del negocio." },
  { id: "otras", titulo: "Otras acciones", descripcion: "Acciones propias del negocio o que aún no tienen grupo." },
];

const OTRAS = "otras";

/** Nombre de cada acción conocida, por su nombre en el AgentSpec, y su grupo de respaldo (el mismo de la API). */
const ACCIONES: Record<string, { grupo: string; nombre: string }> = {
  // Ventas: pedidos, cotizaciones, catálogo y leads.
  generar_cotizacion: { grupo: "cotizaciones", nombre: "Preparar una cotización" },
  aplicar_promocion: { grupo: "catalogo", nombre: "Aplicar una promoción" },
  confirmar_cotizacion: { grupo: "cotizaciones", nombre: "Confirmar la cotización" },
  crear_pedido: { grupo: "pedidos", nombre: "Crear el pedido" },
  agregar_item_pedido: { grupo: "pedidos", nombre: "Agregar productos al pedido" },
  consultar_estado_pedido: { grupo: "pedidos", nombre: "Consultar el estado de un pedido" },
  consultar_inventario: { grupo: "catalogo", nombre: "Consultar el inventario" },
  recomendar_producto: { grupo: "catalogo", nombre: "Recomendar productos" },
  crear_lead: { grupo: "leads", nombre: "Registrar un interesado" },
  calificar_lead: { grupo: "leads", nombre: "Calificar a un interesado" },
  actualizar_lead: { grupo: "leads", nombre: "Actualizar los datos de un interesado" },
  // Pagos (Wompi).
  confirmar_pago_pedido: { grupo: "pagos", nombre: "Confirmar el pago de un pedido" },
  verificar_pago_pedido: { grupo: "pagos", nombre: "Verificar el pago de un pedido" },
  sub_link_pago: { grupo: "pagos", nombre: "Enviar el enlace de pago de una suscripción" },
  cob_link_suscripcion: { grupo: "pagos", nombre: "Enviar el enlace de pago de una suscripción en cobro" },
  // Agenda: citas y disponibilidad.
  create_calendar_event: { grupo: "citas", nombre: "Agendar una cita" },
  update_calendar_event: { grupo: "citas", nombre: "Mover una cita" },
  cancel_calendar_event: { grupo: "citas", nombre: "Cancelar una cita" },
  check_availability: { grupo: "disponibilidad", nombre: "Consultar la disponibilidad" },
  find_next_available: { grupo: "disponibilidad", nombre: "Buscar el próximo espacio libre" },
  list_client_appointments: { grupo: "citas", nombre: "Ver las citas del cliente" },
  list_calendars: { grupo: "disponibilidad", nombre: "Ver las agendas" },
  list_appointment_types: { grupo: "disponibilidad", nombre: "Ver los tipos de cita" },
  // Cobranza: cartera, promesas y suscripciones.
  cob_consultar_saldo: { grupo: "cartera", nombre: "Consultar el saldo" },
  cob_estado_cuenta: { grupo: "cartera", nombre: "Enviar el estado de cuenta" },
  cob_evaluar_negociacion: { grupo: "promesas", nombre: "Evaluar una negociación" },
  cob_opciones_promesa: { grupo: "promesas", nombre: "Ofrecer opciones de promesa de pago" },
  cob_registrar_promesa_pago: { grupo: "promesas", nombre: "Registrar una promesa de pago" },
  cob_registrar_promesa_saldo: { grupo: "promesas", nombre: "Registrar una promesa sobre el saldo" },
  cob_registrar_abono: { grupo: "cartera", nombre: "Registrar un abono" },
  cob_consultar_suscripcion: { grupo: "suscripciones", nombre: "Consultar una suscripción en cobro" },
  cob_crear_suscripcion: { grupo: "suscripciones", nombre: "Crear una suscripción en cobro" },
  cob_pausar_suscripcion: { grupo: "suscripciones", nombre: "Pausar una suscripción en cobro" },
  cob_cancelar_suscripcion: { grupo: "suscripciones", nombre: "Cancelar una suscripción en cobro" },
  cob_renovar_suscripcion: { grupo: "suscripciones", nombre: "Renovar una suscripción en cobro" },
  // Suscripciones.
  sub_listar_planes: { grupo: "suscripciones", nombre: "Mostrar los planes" },
  sub_cotizar_inscripcion: { grupo: "suscripciones", nombre: "Cotizar la inscripción a un plan" },
  sub_inscribir: { grupo: "suscripciones", nombre: "Inscribir en un plan" },
  sub_confirmar_inscripcion: { grupo: "suscripciones", nombre: "Confirmar la inscripción" },
  sub_consultar: { grupo: "suscripciones", nombre: "Consultar la suscripción" },
  sub_cotizar_cambio_plan: { grupo: "suscripciones", nombre: "Cotizar un cambio de plan" },
  sub_cambiar_plan: { grupo: "suscripciones", nombre: "Cambiar de plan" },
  sub_aplicar_cambio_plan: { grupo: "suscripciones", nombre: "Aplicar el cambio de plan" },
  sub_pausar: { grupo: "suscripciones", nombre: "Pausar la suscripción" },
  sub_cancelar: { grupo: "suscripciones", nombre: "Cancelar la suscripción" },
  // Clientes y memoria.
  get_customer_profile: { grupo: "clientes", nombre: "Ver el perfil del cliente" },
  update_customer_profile: { grupo: "clientes", nombre: "Actualizar el perfil del cliente" },
  consultar_datos_cliente: { grupo: "clientes", nombre: "Consultar los datos del cliente" },
  responder_aviso_datos: { grupo: "clientes", nombre: "Responder el aviso de datos del cliente" },
  consultar_historial_cliente: { grupo: "clientes", nombre: "Consultar el historial del cliente" },
  remember_fact: { grupo: "clientes", nombre: "Recordar un dato del cliente" },
  search_memories: { grupo: "clientes", nombre: "Buscar en lo que recuerda" },
  // Conversación.
  escalate_to_human: { grupo: "conversacion", nombre: "Pasar la conversación a una persona" },
  set_conversation_note: { grupo: "conversacion", nombre: "Dejar una nota en la conversación" },
  send_email: { grupo: "conversacion", nombre: "Enviar un correo" },
  enviar_plantilla_opciones: { grupo: "conversacion", nombre: "Enviar opciones con botones" },
  load_playbook: { grupo: "conversacion", nombre: "Consultar las instrucciones de un superpoder" },
  get_conversation_usage: { grupo: "conversacion", nombre: "Consultar el consumo de la conversación" },
  // Conocimiento.
  buscar_conocimiento: { grupo: "conocimiento", nombre: "Buscar en tus documentos" },
};

/** Respaldo para acciones que ni la API ni el mapa agrupan: el grupo por el prefijo o la palabra del nombre. */
function grupoPorNombre(tool: string): string {
  if (tool.startsWith("cob_")) {
    if (tool.endsWith("_suscripcion")) return "suscripciones";
    return /promesa|negociacion/.test(tool) ? "promesas" : "cartera";
  }
  if (tool.startsWith("sub_")) return "suscripciones";
  if (/availab/.test(tool)) return "disponibilidad";
  if (/calendar|appointment/.test(tool)) return "citas";
  if (/cotizacion/.test(tool)) return "cotizaciones";
  if (/pedido/.test(tool)) return "pedidos";
  if (/lead/.test(tool)) return "leads";
  return OTRAS;
}

function enPalabras(texto: string): string {
  const t = humanizar(texto);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Grupo de una acción: el que manda la API si viene; si no, el del mapa o el del nombre. Un grupo que el
 * panel aún no conoce se muestra con su clave en palabras («nuevo_grupo» → «Nuevo grupo»), no se pierde.
 */
export function grupoDeAccion(tool: string, grupoDeLaApi?: string | null): GrupoDeAcciones {
  const id = grupoDeLaApi?.trim() || ACCIONES[tool]?.grupo || grupoPorNombre(tool);
  return GRUPOS_DE_ACCIONES.find((g) => g.id === id) ?? { id, titulo: enPalabras(id), descripcion: "" };
}

/** Nombre de la acción para el dueño: el del mapa o el nombre técnico en palabras («crear pedido» → «Crear pedido»). */
export function nombreDeAccion(tool: string): string {
  return ACCIONES[tool]?.nombre ?? enPalabras(tool);
}

/**
 * Acciones agrupadas: primero los grupos conocidos en el orden de `GRUPOS_DE_ACCIONES`, luego los que el
 * panel no conoce (en el orden en que aparecen) y al final «Otras acciones». Dentro del grupo, en el orden
 * en que llegaron. `grupo` es el de la API; sin él se usa el respaldo por nombre.
 */
export function agruparAcciones<T extends { tool: string; grupo?: string | null }>(
  acciones: T[],
): { grupo: GrupoDeAcciones; acciones: T[] }[] {
  const conocidos = GRUPOS_DE_ACCIONES.map((g) => g.id);
  const orden = (id: string) => (id === OTRAS ? Infinity : conocidos.includes(id) ? conocidos.indexOf(id) : conocidos.length);
  const porGrupo = new Map<string, { grupo: GrupoDeAcciones; acciones: T[] }>();
  for (const accion of acciones) {
    const grupo = grupoDeAccion(accion.tool, accion.grupo);
    const entrada = porGrupo.get(grupo.id) ?? { grupo, acciones: [] };
    entrada.acciones.push(accion);
    porGrupo.set(grupo.id, entrada);
  }
  return [...porGrupo.values()].sort((a, b) => orden(a.grupo.id) - orden(b.grupo.id));
}

/** Solo para el test: los nombres que el mapa conoce. */
export const ACCIONES_CONOCIDAS = Object.keys(ACCIONES);
