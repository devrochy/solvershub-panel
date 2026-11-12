/**
 * Grupos y nombres legibles de las acciones de un agente (fase 5a de la SPEC «habilidades por agente»,
 * ADR-0190 en preparación).
 *
 * TEMPORAL: el backend todavía no expone el grupo ni el nombre de cada acción, así que se arman aquí
 * con un mapa por nombre de la acción (los de `packages/pack-*` y `core/` de agent-core). Cuando la API
 * traiga `grupo`, este módulo se borra y la pestaña Acciones usa lo que venga de ella.
 */
import { humanizar } from "@/lib/turno";

export type GrupoDeAcciones = { id: string; titulo: string; descripcion: string };

/** En el orden en que se muestran. «Otras acciones» va siempre al final: nada se queda sin mostrar. */
export const GRUPOS_DE_ACCIONES: GrupoDeAcciones[] = [
  { id: "pedidos", titulo: "Pedidos", descripcion: "Cotizar, crear y seguir los pedidos de tus clientes." },
  { id: "catalogo", titulo: "Catálogo", descripcion: "Consultar productos y recomendarlos." },
  { id: "citas", titulo: "Citas", descripcion: "Agendar, mover y cancelar citas en tus agendas." },
  { id: "cartera", titulo: "Cartera", descripcion: "Saldos, abonos y promesas de pago." },
  { id: "suscripciones", titulo: "Suscripciones", descripcion: "Planes, inscripciones, pausas y cancelaciones." },
  { id: "pagos", titulo: "Pagos", descripcion: "Enlaces de pago y confirmación de pagos." },
  { id: "leads", titulo: "Leads", descripcion: "Registrar y calificar a quien pregunta por primera vez." },
  { id: "clientes", titulo: "Clientes", descripcion: "Lo que el agente sabe y recuerda de cada cliente." },
  { id: "conversacion", titulo: "Conversación", descripcion: "Pasar a una persona, dejar notas y enviar mensajes." },
  { id: "conocimiento", titulo: "Conocimiento", descripcion: "Buscar en los documentos del negocio." },
  { id: "otras", titulo: "Otras acciones", descripcion: "Acciones propias del negocio o que aún no tienen grupo." },
];

const OTRAS = "otras";

/** Grupo y nombre de cada acción conocida, por su nombre en el AgentSpec. */
const ACCIONES: Record<string, { grupo: string; nombre: string }> = {
  // Ventas: pedidos, catálogo y leads.
  generar_cotizacion: { grupo: "pedidos", nombre: "Preparar una cotización" },
  aplicar_promocion: { grupo: "pedidos", nombre: "Aplicar una promoción" },
  confirmar_cotizacion: { grupo: "pedidos", nombre: "Confirmar la cotización" },
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
  // Agenda.
  create_calendar_event: { grupo: "citas", nombre: "Agendar una cita" },
  update_calendar_event: { grupo: "citas", nombre: "Mover una cita" },
  cancel_calendar_event: { grupo: "citas", nombre: "Cancelar una cita" },
  check_availability: { grupo: "citas", nombre: "Consultar la disponibilidad" },
  find_next_available: { grupo: "citas", nombre: "Buscar el próximo espacio libre" },
  list_client_appointments: { grupo: "citas", nombre: "Ver las citas del cliente" },
  list_calendars: { grupo: "citas", nombre: "Ver las agendas" },
  list_appointment_types: { grupo: "citas", nombre: "Ver los tipos de cita" },
  // Cobranza.
  cob_consultar_saldo: { grupo: "cartera", nombre: "Consultar el saldo" },
  cob_estado_cuenta: { grupo: "cartera", nombre: "Enviar el estado de cuenta" },
  cob_evaluar_negociacion: { grupo: "cartera", nombre: "Evaluar una negociación" },
  cob_opciones_promesa: { grupo: "cartera", nombre: "Ofrecer opciones de promesa de pago" },
  cob_registrar_promesa_pago: { grupo: "cartera", nombre: "Registrar una promesa de pago" },
  cob_registrar_promesa_saldo: { grupo: "cartera", nombre: "Registrar una promesa sobre el saldo" },
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

/** Para acciones nuevas que el mapa aún no nombra: el grupo por el prefijo o la palabra del nombre. */
function grupoPorNombre(tool: string): string {
  if (tool.startsWith("cob_")) return tool.endsWith("_suscripcion") ? "suscripciones" : "cartera";
  if (tool.startsWith("sub_")) return "suscripciones";
  if (/calendar|appointment/.test(tool)) return "citas";
  if (/pedido|cotizacion/.test(tool)) return "pedidos";
  if (/lead/.test(tool)) return "leads";
  return OTRAS;
}

export function grupoDeAccion(tool: string): GrupoDeAcciones {
  const id = ACCIONES[tool]?.grupo ?? grupoPorNombre(tool);
  return GRUPOS_DE_ACCIONES.find((g) => g.id === id) ?? GRUPOS_DE_ACCIONES[GRUPOS_DE_ACCIONES.length - 1];
}

/** Nombre de la acción para el dueño: el del mapa o el nombre técnico en palabras («crear pedido» → «Crear pedido»). */
export function nombreDeAccion(tool: string): string {
  const conocida = ACCIONES[tool]?.nombre;
  if (conocida) return conocida;
  const texto = humanizar(tool);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Acciones agrupadas en el orden de `GRUPOS_DE_ACCIONES`; dentro del grupo, en el orden en que llegaron. */
export function agruparAcciones<T extends { tool: string }>(acciones: T[]): { grupo: GrupoDeAcciones; acciones: T[] }[] {
  return GRUPOS_DE_ACCIONES.map((grupo) => ({ grupo, acciones: acciones.filter((a) => grupoDeAccion(a.tool).id === grupo.id) })).filter(
    (g) => g.acciones.length > 0,
  );
}

/** Solo para el test: los nombres que el mapa conoce. */
export const ACCIONES_CONOCIDAS = Object.keys(ACCIONES);
