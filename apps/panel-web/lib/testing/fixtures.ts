/**
 * Respuestas de prueba del backend para renderizar las páginas principales en jsdom
 * (HU-UI-04). Datos ficticios con prefijo `test-`. Van tipadas con los tipos generados
 * del OpenAPI: si el contrato cambia, el typecheck obliga a actualizarlas.
 */
import type { AvisoDatos } from "@/lib/aviso-datos";
import type { PoliticaDatos } from "@/lib/datos-cliente";
import type {
  AgendaCalendario,
  AgentConversationPage,
  AgentSummary,
  Graph,
  AgentsOverview,
  AgentTaskPage,
  AvisoDeCargo,
  CargosSuscripcionPage,
  CargoSuscripcion,
  CatalogoDeMensajes,
  ClientesConSuscripcionPage,
  CollaboratorItem,
  ConnectionsConsole,
  ConnectionsResponse,
  ConversationConnection,
  ConversationDetail,
  ConversationPage,
  Dashboard,
  EscalationPage,
  LeadsResponse,
  Me,
  MetricasSuscripciones,
  MissingTemplates,
  PlanResponse,
  PlatformTenantPage,
  PluginSummary,
  PrimerosPasos,
  ResumenPorAgente,
  SettingsResponse,
  SubscriptionProviderSettings,
  SuscripcionDetalle,
  SuscripcionesPage,
  SuscripcionItem,
  WebChatSettings,
} from "@/lib/api/types";

const TENANT = { id: "test-tenant-1", name: "Negocio de prueba", role: "owner", active: true };

const SECCIONES = [
  "dashboard",
  "agents",
  "conversations",
  "escalations",
  "leads",
  "connections",
  "plugins",
  "collaborators",
  "settings",
  "plan",
  "costs",
  "pack_subscriptions:suscripciones",
  "pack_cobranza:resumen",
  "pack_cobranza:carteras",
  "pack_cobranza:clientes",
  "pack_cobranza:promesas",
  "pack_cobranza:reportes",
  "pack_calendar:conexion",
  "pack_calendar:tipos",
  "pack_calendar:bloqueos",
  "pack_calendar:citas",
];

export const me: Me = {
  admin_id: "test-admin-1",
  email: "duena@test.example",
  username: "test-duena",
  role: "owner",
  tenant: TENANT,
  tenant_count: 1,
  permissions: Object.fromEntries(SECCIONES.map((s) => [s, "write"])),
  invitaciones_pendientes: 0,
  qa_testers_habilitados: false,
};

export const dashboard: Dashboard = {
  tenant_id: TENANT.id,
  kpi: { conversations_7d: 128, messages_7d: 940, pending_escalations: 2, cost_30d: 12.4, active_plugins: 3 },
  bot_paused: false,
  llm_label: "deepseek-chat",
  recent: [
    { id: "test-conv-1", customer_name: "Ana Prueba", external_id: "573000000001", status: "open" },
    { id: "test-conv-2", customer_name: null, external_id: "573000000002", status: "resolved" },
  ],
  billing: { plan_name: "Básico", status: "active", operational: true, days_left: 11, has_plan: true },
};

/** Recorrido de primer uso de un negocio al que no aplica (anterior al corte): sin asistente ni aviso. */
export const RECORRIDO_NO_APLICA: PrimerosPasos["recorrido"] = {
  estado: "no_aplica",
  paso: 1,
  total_pasos: 6,
  aplica: false,
  abrir: false,
  avisar: false,
};

export const resumenPorAgente: ResumenPorAgente = {
  periodo: {
    desde: "2026-10-20T00:00:00Z",
    hasta: "2026-10-27T00:00:00Z",
    previo_desde: "2026-10-13T00:00:00Z",
    previo_hasta: "2026-10-20T00:00:00Z",
  },
  runtime: "v3",
  general: {
    kpis: [
      { id: "conversaciones", label: "Conversaciones", valor: 128, unidad: "count", previo: 100, delta_pct: 28, polaridad: "up-good", hint: "Últimos 7 días", destino: { ruta: "conversaciones", params: {} } },
      { id: "escalaciones_pendientes", label: "Escalaciones pendientes", valor: 2, unidad: "count", previo: null, delta_pct: null, polaridad: "up-bad", destino: { ruta: "escalaciones", params: {} } },
      { id: "tasa_escalamiento", label: "Tasa de escalamiento", valor: null, unidad: "pct", previo: null, delta_pct: null, polaridad: "up-bad", hint: "Sin datos suficientes", destino: { ruta: "agente", params: { ref: "general", pestana: "consumo" } } },
    ],
  },
  agentes: [
    {
      ref: "agente-ventas",
      key: "ventas",
      name: "Ventas",
      kind: "specialist",
      kpis: [
        { id: "turnos", label: "Turnos atendidos", valor: 60, unidad: "count", previo: 40, delta_pct: 50, polaridad: "up-good", destino: { ruta: "agente", params: { ref: "agente-ventas", pestana: "conversaciones" } } },
        { id: "tareas_abiertas", label: "Tareas abiertas", valor: 3, unidad: "count", previo: null, delta_pct: null, polaridad: "up-bad", destino: { ruta: "agente", params: { ref: "agente-ventas", pestana: "tareas" } } },
      ],
      modulos: [
        {
          id: "pack_commerce",
          nombre: "Ventas",
          error: null,
          kpis: [
            { id: "pedidos", label: "Pedidos", valor: 14, unidad: "count", previo: 10, delta_pct: 40, polaridad: "up-good", destino: { ruta: "comercio.pedidos", params: {} } },
            { id: "ventas_pagadas", label: "Ventas pagadas", valor: 1250000, unidad: "money", previo: 900000, delta_pct: 38.9, polaridad: "up-good", destino: { ruta: "comercio.pedidos", params: { pago: "pagado" } } },
          ],
        },
      ],
    },
  ],
};

export const primerosPasos: PrimerosPasos = {
  recorrido: RECORRIDO_NO_APLICA,
  alta_en: "2026-10-01T12:00:00Z",
  origen: "manual",
  completos: 1,
  total: 3,
  pasos: [
    { clave: "datos_negocio", estado: "completo", puede_actuar: true },
    { clave: "whatsapp", estado: "pendiente", motivo: "sin_conexion", puede_actuar: true },
    { clave: "probar_asistente", estado: "pendiente", puede_actuar: true },
  ],
};

export const plantillasFaltantes: MissingTemplates = { total_7d: 0, recent: [], total_eventos_7d: 0, total_opciones_7d: 0 };

export const conversaciones: ConversationPage = {
  items: [
    {
      id: "test-conv-1",
      customer_name: "Ana Prueba",
      external_id: "573000000001",
      channel: "whatsapp",
      status: "escalated",
      bot_paused: true,
      started_at: "2026-10-09T15:00:00Z",
      last_message: "Quiero hablar con alguien",
      last_message_at: "2026-10-09T15:05:00.123456Z",
      last_message_sender: "customer",
      connection_id: "test-conn-1",
      connection_label: "Ventas",
      connection_provider: "meta",
      connection_type: "whatsapp_meta",
      pending_count: 2,
    },
    {
      id: "test-conv-2",
      customer_name: null,
      external_id: "573000000002",
      channel: "web",
      status: "resolved",
      bot_paused: true,
      started_at: "2026-10-08T10:30:00Z",
      pending_count: 0,
    },
  ],
  total: 2,
  page: 1,
  page_size: 20,
  has_more: false,
};

export const escalaciones: EscalationPage = {
  items: [
    {
      conversation_id: "test-conv-1",
      customer_name: "Ana Prueba",
      external_id: "573000000001",
      reason: "tool:solicitud_cliente",
      reason_code: "solicitud_cliente",
      reason_label: "Solicitud del cliente",
      summary: "Pide hablar con una persona sobre su pedido.",
      status: "pending",
      created_at: "2026-10-09T15:05:00Z",
    },
    {
      conversation_id: "test-conv-2",
      customer_name: "Luis Prueba",
      external_id: "573000000002",
      reason: "tool:queja",
      reason_code: "queja",
      reason_label: "Queja",
      summary:
        "El pedido llegó dos días tarde y con una pieza equivocada. Ya escribió tres veces, pide la devolución " +
        "del dinero y quiere que lo llame un encargado hoy mismo.",
      status: "pending",
      created_at: "2026-10-09T16:20:00Z",
    },
    {
      conversation_id: "test-conv-3",
      customer_name: null,
      external_id: "573000000003",
      reason: "plugin:crear_pedido",
      reason_code: "accion_habilidad",
      reason_label: "Acción de Comercio",
      summary: "El pedido supera el monto que requiere aprobación.",
      status: "resuelta",
      created_at: "2026-10-09T17:45:00Z",
    },
  ],
  total: 3,
  page: 1,
  page_size: 20,
  has_more: false,
};

export const leads: LeadsResponse = {
  columns: [{ key: "ciudad", label: "Ciudad" }],
  filters: [],
  agents: [{ key: "general", name: "General", icon: "bot", columns: [] }],
  items: [
    {
      id: "test-lead-1",
      cliente: "Ana Prueba",
      canal: "whatsapp",
      bot_paused: false,
      alta: "2026-10-09T15:00:00Z",
      extras: { ciudad: "Medellín" },
      perfil: {
        name: "Ana",
        apellido: "Prueba",
        alias: "Anita",
        avatar_url: null,
        nombre_visible: "Ana Prueba",
        phone: "+573000000000",
        phone_e164: "+573000000000",
        phone_indicativo: "+57",
        phone_local: "3000000000",
        pais_telefono: "CO",
        email: null,
        tipo_documento: null,
        id_document: null,
        address: null,
        municipio: "Medellín",
        departamento: "Antioquia",
        pais: "Colombia",
        latitud: null,
        longitud: null,
        mapa_url: null,
        clasificacion: null,
        clasificacion_label: null,
      },
      agentes: ["general"],
    },
  ],
  total: 1,
  page: 1,
  page_size: 20,
  has_more: false,
};

export const colaboradores: CollaboratorItem[] = [
  {
    id: "test-admin-1",
    email: "duena@test.example",
    username: "test-duena",
    nombre: "Dueña de prueba",
    telefono: "+57 300 000 0000",
    avatar_url: null,
    role: "owner",
    active: true,
    is_self: true,
    is_platform_master: false,
    permissions: [],
    links: [{ role: "owner", slug: "negocio-de-prueba", name: TENANT.name }],
  },
  {
    id: "test-admin-2",
    email: "operador@test.example",
    username: null,
    nombre: null,
    telefono: null,
    avatar_url: null,
    role: "collaborator",
    active: true,
    is_self: false,
    is_platform_master: false,
    permissions: [{ section: "conversations", access: "write", scope: "tenant" }],
    links: [{ role: "collaborator", slug: "negocio-de-prueba", name: TENANT.name }],
  },
];

export const rolesDePack = [{ value: "gestor", label: "Gestor de cobranza" }];

export const habilidades: PluginSummary[] = [
  {
    id: "pack_commerce",
    name: "pack_commerce",
    version: "1.0.0",
    status: "loaded",
    error_message: null,
    has_config: true,
    enabled_for_tenant: true,
    tenant_health_error: null,
    display_name: "Comercio",
    category: "ventas",
    description: "Catálogo, pedidos y pagos por WhatsApp.",
    required_connections: [],
    min_plan: "free",
    action_summary: [],
    setup_guide: "",
  },
  {
    id: "pack_calendar",
    name: "pack_calendar",
    version: "1.0.0",
    status: "loaded",
    error_message: null,
    has_config: false,
    enabled_for_tenant: false,
    tenant_health_error: null,
    display_name: "Agenda",
    category: "operacion",
    description: "Citas, horarios y recordatorios.",
    required_connections: [],
    min_plan: "free",
    action_summary: [],
    setup_guide: "",
  },
];

export const proveedorSuscripciones: SubscriptionProviderSettings = {
  estado: "sin_proveedor",
  habilitados: [],
  mensaje: "Todavía no hay un proveedor de pagos configurado.",
};

export const conversacionAbierta: ConversationDetail = {
  ...conversaciones.items[0],
  messages: [
    {
      id: "test-msg-1",
      direction: "inbound",
      sender_type: "customer",
      content: "¿Tienen envío?",
      status: "sent",
      created_at: "2026-10-09T15:00:00.000001Z",
    },
    {
      id: "test-msg-2",
      direction: "outbound",
      sender_type: "agent",
      content: "Sí, a todo el país.",
      status: "sent",
      created_at: "2026-10-09T15:00:05.000001Z",
      tool_calls: ["buscar_producto", "consultar_envio"],
    },
    {
      id: "test-msg-3",
      direction: "inbound",
      sender_type: "customer",
      content: "Quiero hablar con alguien",
      status: "sent",
      created_at: "2026-10-09T15:05:00.123456Z",
    },
  ],
  escalation: {
    id: "test-esc-1",
    reason_code: "solicitud_cliente",
    reason_label: "Solicitud del cliente",
    summary: "Pide hablar con una persona por un envío.",
    status: "pendiente",
    assigned_admin_id: null,
    assigned_admin_email: null,
    created_at: "2026-10-09T15:05:01Z",
  },
  notes: [{ text: "Cliente frecuente", source: "agent", author_email: null, created_at: null }],
  usage: { cost_usd: 0.0125, input_tokens: 1200, output_tokens: 300, turns: 1 },
};

export const conexionesDeConversaciones: ConversationConnection[] = [
  { id: "test-conn-1", label: "Ventas", provider: "meta", type_id: "whatsapp_meta", channel: "whatsapp" },
  { id: "test-conn-2", label: "Soporte", provider: "waweb", type_id: "whatsapp_waweb", channel: "whatsapp" },
];

export const conexiones: ConnectionsResponse = {
  items: [
    {
      id: "test-conn-1",
      kind: "meta",
      origin: "byok",
      channel: "whatsapp",
      label: "WhatsApp principal",
      external_id: "test-phone-1",
      active: true,
      is_primary: true,
      created_at: "2026-10-01T12:00:00Z",
      coexistence: false,
    },
    {
      id: "11111111-1111-4111-8111-111111111111",
      kind: "channel",
      type_id: "google_calendar",
      origin: "oauth",
      channel: "",
      label: "Google Calendar",
      external_id: "ana@clinica.co",
      active: true,
      is_primary: false,
      created_at: "2026-10-02T12:00:00Z",
      coexistence: false,
    },
  ],
  webhook_url: "https://api.test.example/webhook/meta",
};

export const consolaConexiones: ConnectionsConsole = {
  items: [
    {
      id: "test-conn-1",
      channel: "whatsapp",
      type_id: "whatsapp_meta",
      label: "WhatsApp principal",
      external_id: "test-phone-1",
      conversational: true,
      active: true,
      is_primary: true,
      created_at: "2026-10-01T12:00:00Z",
      meta_connection_id: "test-meta-1",
      health: "ok",
      pause_scope: "meta_account",
      pausable: true,
      coordinator: null,
      agents: [],
      active_release: null,
      canary_release: null,
      usage_7d: { turns: 0, conversations: 0, input_tokens: 0, output_tokens: 0, cost_usd: null },
    },
    {
      id: "test-conn-3",
      channel: "",
      type_id: "google_calendar",
      label: "Google Calendar",
      external_id: "agenda@test.example",
      conversational: false,
      active: true,
      is_primary: false,
      created_at: "2026-10-02T12:00:00Z",
      meta_connection_id: null,
      health: "ok",
      pause_scope: "connection",
      pausable: false,
      coordinator: null,
      agents: [],
      active_release: null,
      canary_release: null,
      usage_7d: { turns: 0, conversations: 0, input_tokens: 0, output_tokens: 0, cost_usd: null },
    },
  ],
  total: 2,
  page: 1,
  page_size: 50,
  has_more: false,
  runtime: "v3",
  routing: "active",
  consistency: null,
  can_edit: true,
  unassigned_agents: [],
};

export const negociosDePlataforma: PlatformTenantPage = {
  items: [
    {
      id: "00000000-0000-4000-8000-0000000000b1",
      name: "Negocio de prueba",
      slug: "negocio-prueba",
      status: "active",
      created_at: "2026-10-01T00:00:00Z",
      plan_name: "Básico",
      plan_status: "active",
      operational: true,
    },
    {
      id: "00000000-0000-4000-8000-0000000000b2",
      name: "Negocio suspendido",
      slug: "negocio-suspendido",
      status: "suspended",
      created_at: "2026-09-01T00:00:00Z",
      plan_name: "Básico",
      plan_status: "past_due",
      operational: false,
    },
  ],
  page: 1,
  page_size: 30,
  has_more: false,
  total: 2,
};

export const plan: PlanResponse = {
  overview: { plan_id: "basic", plan_name: "Básico", status: "active", operational: true, days_left: 11, has_plan: true },
  usage: [
    { key: "conversations", label: "Conversaciones", unit: "conv", scope: "month", used: 120, limit: 500, percent: 24, exceeded: false },
    { key: "agentes", label: "Agentes publicados", unit: "agentes", scope: "lifetime", used: 2, limit: 2, percent: 100, exceeded: false },
    { key: "colaboradores", label: "Colaboradores", unit: "colaboradores", scope: "lifetime", used: 1, limit: 5, percent: 20, exceeded: false },
  ],
  payments: [],
  plans: [
    { id: "free", name: "Free", price_cop: 0, is_free: true, current: false, limits: { colaboradores: 2, agentes: 1 }, features: {}, monthly_credits: 2500 },
    { id: "basic", name: "Básico", price_cop: 99000, is_free: false, current: true, limits: { colaboradores: 5, agentes: 2 }, features: {}, monthly_credits: 20000 },
  ],
  credit: {
    limit: 20000,
    used: 1234.5,
    percent: 6.2,
    period_start: "2026-10-05T12:00:00Z",
    period_end: "2026-11-05T12:00:00Z",
    by_concept: { llm_turn: 1100, stt: 4.5, vision: 0, template_sent: 130 },
    by_agent: [
      { agent_id: "00000000-0000-4000-8000-0000000000a1", name: "Ventas", used: 900 },
      { agent_id: null, name: null, used: 334.5 },
    ],
    by_agent_truncated: false,
  },
  plan_por_el_asistente: false,
};

export const ajustes: SettingsResponse = {
  identity: {
    assistant_name: "Asistente de prueba",
    business_description: "Negocio ficticio para pruebas.",
    brand_voice: "",
    brand_voice_warning: false,
    tono: "cercano",
    business_hours_mode: "bloquea",
    debounce_mode: "natural",
    split_style: "un_mensaje",
    currency: "COP",
    timezone: "America/Bogota",
    guardrail_max_retries: 1,
    guardrail_fail_action: "escalate",
    disabled_guardrails: [],
    available_guardrails: [],
    difficulty_long_message_threshold: 400,
    difficulty_turnos_sin_resolver_threshold: 4,
    difficulty_score_threshold: 3,
    escalation_keywords: [],
    out_of_hours_message: "",
    out_of_hours_default_message:
      "¡Hola! Ahora estamos fuera de nuestro horario de atención. Te respondemos apenas volvamos.",
    auto_escalate_after_turns: 0,
    persona_tone: "cercano",
    persona_warmth: 3,
    persona_emojis: "sparse",
    persona_max_length: 400,
    persona_forbidden: [],
    bot_paused: false,
    business_tz: "America/Bogota",
    business_ranges: [],
  },
  brain: { model_primary: "deepseek-chat", model_temperature: 0.3, policy_max_tool_calls: 6, policy_budget: 0.05 },
  memory: { short_term_turns: 10, rag_top_k: 4, rag_min_score: 0.3 },
  skills: [],
};

export const chatWeb: WebChatSettings = {
  enabled: false,
  key: "test-widget-key",
  allowed_origins: [],
  turnstile_configured: false,
  snippet: "",
};

/** `/admin/settings/media` (SPEC-04, ADR-0151): configuración para la pestaña Multimedia. */
export const ajustesMultimedia = {
  audio: {
    enabled: true,
    provider: "groq",
    model: "whisper-large-v3-turbo",
    has_api_key: false,
    using_platform_key: true,
  },
  vision: {
    enabled: true,
    mode: "describir",
    provider: "deepseek",
    model: "deepseek-flash",
    has_api_key: false,
    using_platform_key: true,
  },
  catalog: {
    audio: [
      {
        key: "groq",
        label: "Groq · Whisper",
        default_model: "whisper-large-v3-turbo",
        models: [{ id: "whisper-large-v3-turbo", label: "Whisper Large v3 Turbo" }],
      },
    ],
    vision: [
      {
        key: "deepseek",
        label: "DeepSeek · visión",
        default_model: "deepseek-flash",
        models: [{ id: "deepseek-flash", label: "DeepSeek Flash" }],
      },
    ],
  },
};

/** `/admin/settings/advanced` no está tipado en el OpenAPI: forma de `SettingsTabs`. */
export const ajustesAvanzados = {
  versions: [{ id: "test-spec-1", version: "1", is_active: true, created_at: "2026-10-01T12:00:00Z" }],
  llm: { llm_provider: "deepseek", llm_model: "deepseek-chat", has_api_key: false },
  guardrails_text: "",
  flow: { source: "preset", sections: [{ label: "Saludo", purpose: "Recibir al cliente", tools: [] }], unknown_tools: [] },
  eval_runs: [],
  spec: {},
};

export const resumenCobranza = {
  kpis: [
    { label: "Recaudo de hoy", value: "$ 1.250.000" },
    { label: "Clientes en mora", value: "8" },
  ],
};

export const agentes: AgentsOverview = {
  runtime: "v3",
  items: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      ref: "general",
      key: "general",
      name: "General",
      kind: "specialist",
      status: "active",
      virtual: false,
      published: true,
      connections: [{ id: "00000000-0000-4000-8000-0000000000c1", label: "test-Chat web", enabled: true }],
      incluye_sin_atribuir: true,
      turns: 12,
      conversations: 4,
      cost_usd: 0.42,
      last_activity_at: "2026-10-18T10:00:00Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      ref: "00000000-0000-4000-8000-000000000002",
      key: "ventas",
      name: "Ventas",
      kind: "specialist",
      status: "active",
      virtual: false,
      published: true,
      connections: [{ id: "00000000-0000-4000-8000-0000000000c1", label: "test-Chat web", enabled: true }],
      incluye_sin_atribuir: false,
      turns: 0,
      conversations: 0,
      cost_usd: 0,
      last_activity_at: null,
    },
  ],
  sin_atribuir: { turns: 0, conversations: 0, cost_usd: 0, last_activity_at: null },
};

export const conversacionesDeAgente: AgentConversationPage = {
  items: [
    {
      conversation_id: "00000000-0000-4000-8000-0000000000a1",
      customer_id: "00000000-0000-4000-8000-0000000000b1",
      customer_name: "test-Ana",
      channel: "web",
      status: "open",
      connection_id: "00000000-0000-4000-8000-0000000000c1",
      connection_label: "test-Chat web",
      agent_version: 3,
      turns: 2,
      cost_usd: 0.02,
      last_turn_at: "2026-10-18T10:00:00Z",
    },
  ],
  total: 1,
  page: 1,
  page_size: 20,
  has_more: false,
};

export const tareasVacias: AgentTaskPage = { items: [], total: 0, page: 1, page_size: 20, has_more: false };

/** Agenda (HU-UX-08): tipos con color y código, y estado del calendario. */
export const tiposDeCita = [
  { id: "t-1", name: "Valoración", duration_minutes: 30, description: "", active: true, color: "cat-1", codigo: "VAL" },
  { id: "t-2", name: "Control", duration_minutes: 20, description: "", active: true, color: "cat-3", codigo: "CTL" },
];

export const estadoCalendario = {
  configured: true,
  connected: false,
  account_email: "",
  connection_label: "",
  timezone: "America/Bogota",
  default_duration_minutes: 60,
  calendars: [],
  multi_activo: false,
  multi_agenda_modo: "cliente_elige",
};

/** Agendas del negocio (HU-CAL-08): una sola (el caso de siempre) o dos (el cliente elige). */
export const agendaPrincipal: AgendaCalendario = {
  id: "ag-1",
  name: "Agenda principal",
  description: "",
  aliases: [],
  color: "cat-1",
  timezone: "America/Bogota",
  own_timezone: null,
  business_hours: null,
  is_default: true,
  active: true,
  sort_order: 0,
  source: "interno",
  connection_id: null,
  connected: true,
  account_email: "",
  responsable_admin_id: null,
};

export const agendaDeGoogle = {
  ...agendaPrincipal,
  id: "ag-2",
  name: "Dra. Ana",
  description: "Pediatría",
  aliases: ["doctora"],
  color: "cat-2",
  is_default: false,
  sort_order: 1,
  source: "google",
  connection_id: "11111111-1111-4111-8111-111111111111",
  account_email: "ana@clinica.co",
};

export const unaAgenda = { calendars: [agendaPrincipal], multi_activo: false, multi_agenda_modo: "cliente_elige" };
export const dosAgendas = { calendars: [agendaPrincipal, agendaDeGoogle], multi_activo: true, multi_agenda_modo: "cliente_elige" };

/** `/events` de la semana en curso: dos citas (una por agenda) y un bloqueo; sirve al backend de prueba. */
export function eventosAgenda(hoy = new Date()) {
  const dia = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));
  const a = (h: number, min = 0) => new Date(dia.getTime() + (h * 60 + min) * 60_000).toISOString();
  const cita = (id: string, title: string, desde: string, hasta: string, cal: AgendaCalendario, tipo: (typeof tiposDeCita)[number]) => ({
    id,
    title,
    start: desde,
    end: hasta,
    kind: "appointment",
    status: "scheduled",
    source: "local",
    color: "#198754",
    can_cancel: true,
    attendee_email: "cliente@ejemplo.co",
    notes: "",
    appointment_type_id: tipo.id,
    tipo_color: tipo.color,
    tipo_codigo: tipo.codigo,
    calendar_id: cal.id,
    calendar_color: cal.color,
  });
  return {
    events: [
      cita("appt-1", "Laura Gómez", a(15), a(15, 30), agendaPrincipal, tiposDeCita[0]),
      cita("appt-2", "Pedro Ruiz", a(16), a(16, 20), agendaDeGoogle, tiposDeCita[1]),
      {
        ...cita("block-1", "Almuerzo", a(17), a(18), agendaPrincipal, tiposDeCita[0]),
        kind: "block",
        status: "blocked",
        appointment_type_id: "",
        tipo_color: "",
        tipo_codigo: "",
      },
    ],
    tipos: tiposDeCita.map((t) => ({ id: t.id, name: t.name, color: t.color, codigo: t.codigo })),
    calendars: [agendaPrincipal, agendaDeGoogle].map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      is_default: c.is_default,
      active: true,
      disponible: true,
    })),
    multi_activo: true,
    timezone: "America/Bogota",
  };
}

export const configCalendario = { plugin_id: "pack_calendar", values: { business_hours: "mon-fri:09:00-18:00", multi_agenda_modo: "cliente_elige" } };

/** Respuesta por ruta (sin query string). Las rutas sin fixture devuelven 404. */
// ---------------------------------------------------------------- suscripciones (SPEC-35)
const ANA = { id: "test-cliente-ana", nombre: "Ana Prueba", telefono: "+573000000001", canal: "whatsapp" };
const BETO = { id: "test-cliente-beto", nombre: null, telefono: "+573000000002", canal: "whatsapp" };

export const suscripcionEnMora: SuscripcionItem = {
  id: "test-sub-1",
  cliente: ANA,
  plan: "Plan Pro",
  variante_id: "test-variante-pro",
  estado: "activa",
  motivo_pausa: null,
  periodicidad: "mensual",
  valor_periodo: 200000,
  moneda: "COP",
  proximo_cargo: "2026-11-15T00:00:00Z",
  trial_termina: null,
  fecha_alta: "2026-08-15T00:00:00Z",
  deuda: 400000,
  cargos_pendientes: 2,
  en_mora: 200000,
  dias_mora: 10,
};

export const suscripcionPausada: SuscripcionItem = {
  ...suscripcionEnMora,
  id: "test-sub-2",
  cliente: BETO,
  plan: "Plan Basic",
  estado: "pausada",
  motivo_pausa: "cliente",
  valor_periodo: 50000,
  proximo_cargo: null,
  deuda: 0,
  cargos_pendientes: 0,
  en_mora: 0,
  dias_mora: null,
};

export const suscripciones: SuscripcionesPage = {
  items: [suscripcionEnMora, suscripcionPausada],
  total: 2,
  page: 1,
  page_size: 20,
  has_more: false,
};

const cargoVencido: CargoSuscripcion = {
  id: "test-cargo-1",
  suscripcion_id: "test-sub-1",
  cliente: ANA,
  plan: "Plan Pro",
  periodo: "2026-10",
  tipo: "periodo",
  monto: 200000,
  moneda: "COP",
  estado: "pendiente",
  fecha_vencimiento: "2026-10-13T00:00:00Z",
  dias_mora: 10,
  link_url: "https://pago.test/abc",
  pago_externo: null,
  creado: "2026-10-10T00:00:00Z",
};

const cargoPagado: CargoSuscripcion = {
  ...cargoVencido,
  id: "test-cargo-2",
  periodo: "2026-09",
  estado: "pagado",
  fecha_vencimiento: "2026-09-13T00:00:00Z",
  dias_mora: null,
  link_url: null,
  creado: "2026-09-10T00:00:00Z",
};

export const cargosSuscripcion: CargosSuscripcionPage = {
  items: [cargoVencido, cargoPagado],
  total: 2,
  page: 1,
  page_size: 20,
  has_more: false,
};

export const suscripcionDetalle: SuscripcionDetalle = {
  ...suscripcionEnMora,
  fecha_cancelacion: null,
  cambio_programado: { variante_id: "test-variante-basic", plan: { nombre: "Plan Basic", precio: 50000 }, desde: "2026-11-15T00:00:00Z" },
  cargos: [cargoVencido, cargoPagado],
  historial: [
    { at: "2026-10-20T15:00:00Z", accion: "subs_pausada", actor: "admin:duena@test", detalle: "activa → pausada · Motivo: pidió esperar" },
    { at: "2026-10-21T15:00:00Z", accion: "subs_reanudada", actor: "admin:duena@test", detalle: "pausada → activa" },
  ],
  acciones: ["pausar", "cancelar"],
};

export const avisosDelCargo: AvisoDeCargo[] = [
  {
    evento: "subscription.charge_reminder",
    creado: "2026-10-16T14:00:00Z",
    estado_evento: "entregado",
    intentos: 1,
    error_evento: null,
    mensaje_estado: "delivered",
    mensaje_error: null,
    plantilla: null,
    enviado: "2026-10-16T14:00:05Z",
  },
];

export const clientesConSuscripcion: ClientesConSuscripcionPage = {
  items: [
    {
      cliente: ANA,
      suscripciones: 2,
      vivas: 1,
      planes: ["Plan Pro"],
      deuda: 400000,
      en_mora: 200000,
      dias_mora: 10,
      ultimo_periodo_pagado: "2026-09",
    },
  ],
  total: 1,
  page: 1,
  page_size: 20,
  has_more: false,
};

export const metricasSuscripciones: MetricasSuscripciones = {
  moneda: "COP",
  otras_monedas: 0,
  mrr: 400000,
  mrr_mes_anterior: 350000,
  activas: 5,
  en_prueba: 1,
  pendientes_de_pago: 0,
  pausadas: 1,
  vencidas: 0,
  canceladas: 2,
  altas_mes: 3,
  altas_mes_anterior: 2,
  bajas_mes: 1,
  bajas_mes_anterior: 0,
  churn_mes: 0.1667,
  mora: {
    cargos: 3,
    monto: 600000,
    tramos: [
      { etiqueta: "Hasta 7 días", cargos: 1, monto: 200000 },
      { etiqueta: "8 a 30 días", cargos: 1, monto: 200000 },
      { etiqueta: "Más de 30 días", cargos: 1, monto: 200000 },
    ],
  },
  cohortes: [{ cohorte: "2026-10", plan: "Plan Pro", altas: 4, vigentes: 3 }],
  desde: "2026-10-01",
};

// Colaboración entre agentes (HU-AOS-26): dos especialistas, el Coordinador y un permiso.
const VENTAS = "00000000-0000-4000-8000-0000000000a1";
const AGENDA = "00000000-0000-4000-8000-0000000000a2";

function agente(id: string, key: string, name: string, kind: AgentSummary["kind"] = "specialist"): AgentSummary {
  return {
    id, key, name, kind, contract: kind === "core" ? "kernelspec/1" : "agentspec/3", description: "",
    status: "active", latest_version: 1, created_at: "2026-10-20T12:00:00Z",
  };
}

export const agentesDelNegocio: AgentSummary[] = [
  agente(VENTAS, "ventas", "Ventas"),
  agente(AGENDA, "agenda", "Agenda"),
  agente("00000000-0000-4000-8000-0000000000a0", "coordinador", "Coordinador", "core"),
];

export const grafoA2A: Graph = {
  version: { id: "00000000-0000-4000-8000-0000000000f1", version: 1, content_hash: "a".repeat(64), created_at: "2026-10-25T12:00:00Z" },
  links: [
    {
      from_agent_id: VENTAS, to_agent_id: AGENDA, modes: ["query"], intents: [], max_depth: 3, timeout_ms: 15000,
      budget_usd: 0.02, budget_tokens: 20000, data_classes: ["public", "internal"],
    },
  ],
  warnings: [],
};

// Plantillas con opciones (SPEC-40, HU-OPC-06).
export const accionesDeOpciones = {
  acciones: [
    {
      tool: "confirmar_cita",
      descripcion: "Confirma la próxima cita del cliente y le avisa al equipo.",
      parameters: {
        type: "object",
        properties: {
          motivo: { type: "string", title: "Motivo", description: "Se guarda en la cita." },
          aviso_minutos: { type: "integer", title: "Minutos de aviso", minimum: 0, maximum: 1440 },
          canal: { type: "string", title: "Canal", enum: ["whatsapp", "correo"], "x-enumLabels": ["WhatsApp", "Correo"] },
        },
        required: ["motivo"],
      },
      sensible: false,
      confirmacion_obligatoria: false,
    },
    {
      tool: "crear_link_de_pago",
      descripcion: "Crea un link de pago por el valor que indiques.",
      parameters: {
        type: "object",
        properties: {
          monto: { type: "number", title: "Monto (COP)", minimum: 1 },
          concepto: { type: "string", title: "Concepto" },
          cliente: {
            type: "object",
            title: "Datos del cliente",
            properties: { documento: { type: "string", title: "Documento" }, ciudad: { type: "string", title: "Ciudad" } },
          },
        },
        required: ["monto"],
      },
      sensible: true,
      confirmacion_obligatoria: true,
    },
    {
      tool: "reagendar_cita",
      descripcion: "Reagenda la cita del cliente con parámetros que el formulario no sabe pintar.",
      parameters: { oneOf: [{ type: "object" }, { type: "string" }] },
      sensible: false,
      confirmacion_obligatoria: false,
    },
  ],
};

export const variablesDeOpciones = {
  variables: [
    { ruta: "cliente.nombre", descripcion: "Nombre del cliente", origen: "conversacion" },
    { ruta: "negocio.nombre", descripcion: "Nombre del negocio", origen: "servidor" },
  ],
};

export const definicionDeOpciones = {
  body: "Hola {cliente.nombre}, tu cita en {negocio.nombre} es mañana. ¿Qué quieres hacer?",
  footer: "Responde tocando una opción",
  variables: ["cliente.nombre", "negocio.nombre"],
  exclusivo: true,
  ttl_horas: 24,
  opciones: [
    {
      id: "op1",
      titulo: "Confirmar cita",
      accion: { tool: "confirmar_cita", args_fijos: { motivo: "Confirmada desde WhatsApp" }, args_contexto: {}, confirmar: false },
      respuesta_ok: "Listo, {ctx.cliente.nombre}: tu cita quedó confirmada.",
      respuesta_error: "No pudimos confirmarla. Te escribe una persona del equipo.",
      result_keys: [],
    },
    {
      id: "op2",
      titulo: "Pagar el anticipo",
      accion: { tool: "crear_link_de_pago", args_fijos: { monto: 50000 }, args_contexto: {}, confirmar: true },
      respuesta_ok: "Aquí está tu link de pago.",
      respuesta_error: "No pudimos crear el link de pago.",
      result_keys: [],
    },
  ],
};

export const plantillaDeOpciones = {
  clave: "confirmar_cita",
  nombre: "Confirmar cita",
  estado: "published",
  version_vigente: 2,
  tiene_borrador_sin_publicar: false,
  creada_en: "2026-10-20T15:00:00Z",
  actualizada_en: "2026-10-27T10:00:00Z",
  borrador: definicionDeOpciones,
  definicion_vigente: definicionDeOpciones,
  versiones: [
    { version_n: 2, publicada_en: "2026-10-27T10:00:00Z", retirada_en: null, definition_hash: "a".repeat(64), message_template_id: null, meta: null, vigente: true },
    { version_n: 1, publicada_en: "2026-10-21T09:00:00Z", retirada_en: null, definition_hash: "b".repeat(64), message_template_id: null, meta: null, vigente: false },
  ],
};

/** Estado de una plantilla de Meta ligada a una versión (`OpcionesMetaEstadoOut`). */
export const metaDeVersion = (nombre: string, estado: string, extra: Record<string, unknown> = {}) => ({
  message_template_id: "00000000-0000-4000-8000-0000000000aa",
  nombre,
  estado,
  categoria: "UTILITY",
  categoria_anterior: null,
  motivo_rechazo: null,
  recomendacion: null,
  error_de_publicacion: null,
  ...extra,
});

/** Versiones con `meta` para mostrar cada estado de Meta (la vigente es la 5). */
export const versionesConMeta = [
  { version_n: 5, publicada_en: "2026-10-27T10:00:00Z", retirada_en: null, definition_hash: "e".repeat(64), message_template_id: "00000000-0000-4000-8000-0000000000a5", meta: metaDeVersion("demo_estados_v5", "PENDING"), vigente: true },
  { version_n: 4, publicada_en: "2026-10-26T10:00:00Z", retirada_en: null, definition_hash: "d".repeat(64), message_template_id: "00000000-0000-4000-8000-0000000000a4", meta: metaDeVersion("demo_estados_v4", "APPROVED", { categoria: "MARKETING", categoria_anterior: "UTILITY" }), vigente: false },
  { version_n: 3, publicada_en: "2026-10-25T10:00:00Z", retirada_en: null, definition_hash: "c".repeat(64), message_template_id: "00000000-0000-4000-8000-0000000000a3", meta: metaDeVersion("demo_estados_v3", "REJECTED", { motivo_rechazo: "INVALID_FORMAT", recomendacion: "Quita los saltos de línea seguidos del cuerpo." }), vigente: false },
  { version_n: 2, publicada_en: "2026-10-24T10:00:00Z", retirada_en: null, definition_hash: "b".repeat(64), message_template_id: "00000000-0000-4000-8000-0000000000a2", meta: metaDeVersion("demo_estados_v2", "PAUSED"), vigente: false },
  { version_n: 1, publicada_en: "2026-10-23T09:00:00Z", retirada_en: null, definition_hash: "a".repeat(64), message_template_id: "00000000-0000-4000-8000-0000000000a1", meta: metaDeVersion("demo_estados_v1", "DRAFT", { error_de_publicacion: "network_error" }), vigente: false },
];

/** Conexiones de `GET /admin/meta/health`: una lista, una con avisos, una con error y una que no es de WhatsApp. */
const conexionDeSalud = (id: string, extra: Record<string, unknown>) => ({
  id,
  channel: "whatsapp",
  environment: "production",
  origin: "embedded_signup",
  status: "connected",
  status_reason: null,
  last_health_check_at: "2026-10-27T09:00:00Z",
  health: {},
  checks: [],
  billing_manual_status: null,
  business_id: "123456789",
  meta_app_id: "987654321",
  token_expires_at: "2027-01-01T00:00:00Z",
  ...extra,
});
export const saludMeta = {
  connections: [
    conexionDeSalud("00000000-0000-4000-8000-00000000aaaa", {}),
    conexionDeSalud("00000000-0000-4000-8000-00000000bbbb", { environment: "sandbox", origin: "byok", status: "degraded" }),
    conexionDeSalud("00000000-0000-4000-8000-00000000cccc", { status: "error", status_reason: "Token inválido" }),
    conexionDeSalud("00000000-0000-4000-8000-00000000dddd", { channel: "instagram" }),
  ],
};

export const listaDeOpciones = {
  plantillas: [
    { clave: "confirmar_cita", nombre: "Confirmar cita", estado: "published", version_vigente: 2, tiene_borrador_sin_publicar: false, creada_en: "2026-10-20T15:00:00Z", actualizada_en: "2026-10-27T10:00:00Z" },
    { clave: "recordar_pago", nombre: "Recordar pago", estado: "draft", version_vigente: null, tiene_borrador_sin_publicar: true, creada_en: "2026-10-26T15:00:00Z", actualizada_en: "2026-10-26T16:00:00Z" },
    { clave: "encuesta", nombre: "Encuesta de servicio", estado: "retired", version_vigente: 1, tiene_borrador_sin_publicar: false, creada_en: "2026-10-01T15:00:00Z", actualizada_en: "2026-10-15T16:00:00Z" },
  ],
};

// Catálogo unificado de mensajes (ADR-0178, pista D0): uno de cada tipo.
export const catalogoDeMensajes: CatalogoDeMensajes = {
  mensajes: [
    {
      id: "meta:c1:cobro_nuevo:es", tipo: "meta", clave: "cobro_nuevo", nombre: "cobro_nuevo", idioma: "es", estado: "APPROVED",
      estado_detalle: "UTILITY", canales_soportados: ["whatsapp"], variables: ["1", "2"], dialecto_variables: "meta_posicionales",
      resumen: "Hola {{1}}, tu cobro es {{2}}", actualizado_en: "2026-10-28T10:00:00Z",
      fuente: { editor: "meta", connection_id: "c1", message_template_id: "m1" },
    },
    {
      id: "evento:subscription.charge_created", tipo: "evento", clave: "subscription.charge_created", nombre: "subscription.charge_created",
      idioma: "es", estado: "mapeado", estado_detalle: "cobro_nuevo", canales_soportados: ["whatsapp"], variables: ["cliente.nombre", "cargo.monto"],
      dialecto_variables: "llaves_con_ruta", resumen: "Hola {cliente.nombre}, ya está tu cobro", actualizado_en: null,
      fuente: { editor: "evento", evento: "subscription.charge_created" },
    },
    {
      id: "opciones:confirmar_cita", tipo: "opciones", clave: "confirmar_cita", nombre: "Confirmar cita", idioma: null, estado: "published",
      estado_detalle: "APPROVED", canales_soportados: ["whatsapp"], variables: ["cliente.nombre"], dialecto_variables: "llaves_con_ruta",
      resumen: "Hola {cliente.nombre}, ¿confirmas tu cita?", actualizado_en: "2026-10-27T09:00:00Z",
      fuente: { editor: "opciones", clave: "confirmar_cita" },
    },
    {
      id: "texto_pack:pack_calendar:email_body_confirmed", tipo: "texto_pack", clave: "email_body_confirmed",
      nombre: "Cuerpo del correo de confirmación", idioma: null, estado: "por_defecto", estado_detalle: "Agenda", canales_soportados: ["email"],
      variables: ["cliente", "titulo", "fecha", "hora", "negocio"], dialecto_variables: "llaves_con_ruta", resumen: "Hola {cliente}, tu cita quedó agendada",
      actualizado_en: null, fuente: { editor: "texto_pack", plugin_id: "pack_calendar", campo: "email_body_confirmed" },
    },
  ],
  omitidas: [],
  truncado: [],
};

/** `/admin/datos-cliente/politica` (HU-CRM-13): qué datos del cliente pide cada acción del agente. */
export const politicaDatosCliente: PoliticaDatos = {
  niveles: ["requerido", "recomendado", "no_pedir"],
  herramientas_del_agente: false,
  acciones: [
    {
      id: "ventas.crear_pedido",
      modulo: "ventas",
      etiqueta: "Crear un pedido",
      campos: [
        { clave: "nombre", etiqueta: "Nombre", nivel: "requerido", por_defecto: "requerido", ajustable: true, ajustado: false },
        { clave: "direccion", etiqueta: "Dirección de entrega", nivel: "recomendado", por_defecto: "requerido", ajustable: true, ajustado: true },
      ],
    },
    {
      id: "agenda.agendar_cita",
      modulo: "agenda",
      etiqueta: "Agendar una cita",
      campos: [
        { clave: "nombre", etiqueta: "Nombre", nivel: "requerido", por_defecto: "requerido", ajustable: true, ajustado: false },
        { clave: "correo", etiqueta: "Correo electrónico", nivel: "requerido", por_defecto: "requerido", ajustable: false, ajustado: false },
      ],
    },
  ],
};

export const avisoDatos: AvisoDatos = {
  activo: false,
  texto: "Usamos tus datos para atenderte. Responde «acepto» si estás de acuerdo.",
  texto_propio: "",
  es_borrador: true,
  version: "abc123def456",
};

export const RESPUESTAS: Record<string, unknown> = {
  "/admin/datos-cliente/politica": politicaDatosCliente,
  "/admin/datos-cliente/aviso": avisoDatos,
  "/mensajes/catalogo": catalogoDeMensajes,
  "/admin/me": me,
  "/admin/agents/overview": agentes,
  "/admin/agents": agentesDelNegocio,
  "/admin/a2a/graph": grafoA2A,
  "/admin/dashboard": dashboard,
  "/admin/dashboard/agents": resumenPorAgente,
  "/admin/onboarding": primerosPasos,
  "/admin/settings/message-templates/missing": plantillasFaltantes,
  "/plantillas-opciones": listaDeOpciones,
  "/plantillas-opciones/catalogo-acciones": accionesDeOpciones,
  "/plantillas-opciones/catalogo-variables": variablesDeOpciones,
  "/plantillas-opciones/confirmar_cita": plantillaDeOpciones,
  "/admin/meta/health": saludMeta,
  "/admin/conversations": conversaciones,
  "/admin/conversations/connections": conexionesDeConversaciones,
  "/admin/conversations/test-conv-1": conversacionAbierta,
  "/admin/escalations": escalaciones,
  "/admin/leads": leads,
  "/admin/collaborators": colaboradores,
  "/admin/collaborators/pack-roles": rolesDePack,
  "/admin/plugins": habilidades,
  "/admin/settings/subscription-provider": proveedorSuscripciones,
  "/admin/connections": conexiones,
  "/admin/connections/console": consolaConexiones,
  "/admin/plan": plan,
  "/admin/platform/tenants": negociosDePlataforma,
  "/admin/settings": ajustes,
  "/admin/settings/web-chat": chatWeb,
  "/admin/settings/advanced": ajustesAvanzados,
  "/admin/settings/media": ajustesMultimedia,
  "/pack/cobranza/summary": resumenCobranza,
  "/pack/calendar/types": tiposDeCita,
  "/pack/calendar/status": estadoCalendario,
  "/pack/calendar/calendars": unaAgenda,
  "/pack/calendar/events": { ...eventosAgenda(), calendars: [], multi_activo: false },
  "/admin/plugins/pack_calendar/config": configCalendario,
  "/pack/pack_subscriptions/suscripciones": suscripciones,
  "/pack/pack_subscriptions/suscripciones/test-sub-1": suscripcionDetalle,
  "/pack/pack_subscriptions/cargos": cargosSuscripcion,
  "/pack/pack_subscriptions/cargos/test-cargo-1/avisos": avisosDelCargo,
  "/pack/pack_subscriptions/clientes": clientesConSuscripcion,
  "/pack/pack_subscriptions/metricas": metricasSuscripciones,
};
