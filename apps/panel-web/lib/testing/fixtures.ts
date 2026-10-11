/**
 * Respuestas de prueba del backend para renderizar las páginas principales en jsdom
 * (HU-UI-04). Datos ficticios con prefijo `test-`. Van tipadas con los tipos generados
 * del OpenAPI: si el contrato cambia, el typecheck obliga a actualizarlas.
 */
import type {
  CollaboratorItem,
  ConnectionsResponse,
  ConversationPage,
  Dashboard,
  EscalationPage,
  LeadsResponse,
  Me,
  MissingTemplates,
  PlanResponse,
  PluginSummary,
  PrimerosPasos,
  SettingsResponse,
  SubscriptionProviderSettings,
  WebChatSettings,
} from "@/lib/api/types";

const TENANT = { id: "test-tenant-1", name: "Negocio de prueba", role: "owner", active: true };

const SECCIONES = [
  "dashboard",
  "conversations",
  "escalations",
  "leads",
  "connections",
  "plugins",
  "collaborators",
  "settings",
  "plan",
  "costs",
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

export const primerosPasos: PrimerosPasos = {
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

export const plantillasFaltantes: MissingTemplates = { total_7d: 0, recent: [] };

export const conversaciones: ConversationPage = {
  items: [
    {
      id: "test-conv-1",
      customer_name: "Ana Prueba",
      external_id: "573000000001",
      channel: "whatsapp",
      status: "open",
      bot_paused: false,
      started_at: "2026-10-09T15:00:00Z",
    },
    {
      id: "test-conv-2",
      customer_name: null,
      external_id: "573000000002",
      channel: "web",
      status: "resolved",
      bot_paused: true,
      started_at: "2026-10-08T10:30:00Z",
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
      reason: "customer_request",
      summary: "Pide hablar con una persona sobre su pedido.",
      status: "pending",
      created_at: "2026-10-09T15:05:00Z",
    },
  ],
  total: 1,
  page: 1,
  page_size: 20,
  has_more: false,
};

export const leads: LeadsResponse = {
  columns: [{ key: "ciudad", label: "Ciudad" }],
  items: [{ id: "test-lead-1", cliente: "Ana Prueba", canal: "whatsapp", alta: "2026-10-09T15:00:00Z", extras: { ciudad: "Medellín" } }],
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
  ],
  webhook_url: "https://api.test.example/webhook/meta",
};

export const plan: PlanResponse = {
  overview: { plan_id: "basic", plan_name: "Básico", status: "active", operational: true, days_left: 11, has_plan: true },
  usage: [
    { key: "conversations", label: "Conversaciones", unit: "conv", scope: "month", used: 120, limit: 500, percent: 24, exceeded: false },
  ],
  payments: [],
  plans: [
    { id: "free", name: "Free", price_cop: 0, is_free: true, current: false, limits: {}, features: {} },
    { id: "basic", name: "Básico", price_cop: 99000, is_free: false, current: true, limits: {}, features: {} },
  ],
  plan_por_el_asistente: false,
};

export const ajustes: SettingsResponse = {
  identity: {
    assistant_name: "Asistente de prueba",
    business_description: "Negocio ficticio para pruebas.",
    brand_voice: "",
    brand_voice_warning: false,
    tono: "cercano",
    debounce_mode: "normal",
    split_style: "natural",
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
    auto_escalate_after_turns: 0,
    persona_tone: "cercano",
    persona_warmth: 3,
    persona_emojis: "pocos",
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

/** Respuesta por ruta (sin query string). Las rutas sin fixture devuelven 404. */
export const RESPUESTAS: Record<string, unknown> = {
  "/admin/me": me,
  "/admin/dashboard": dashboard,
  "/admin/onboarding": primerosPasos,
  "/admin/settings/message-templates/missing": plantillasFaltantes,
  "/admin/conversations": conversaciones,
  "/admin/escalations": escalaciones,
  "/admin/leads": leads,
  "/admin/collaborators": colaboradores,
  "/admin/collaborators/pack-roles": rolesDePack,
  "/admin/plugins": habilidades,
  "/admin/settings/subscription-provider": proveedorSuscripciones,
  "/admin/connections": conexiones,
  "/admin/plan": plan,
  "/admin/settings": ajustes,
  "/admin/settings/web-chat": chatWeb,
  "/admin/settings/advanced": ajustesAvanzados,
  "/pack/cobranza/summary": resumenCobranza,
};
