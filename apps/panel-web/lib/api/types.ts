/**
 * Tipos del contrato `/api/v1`, derivados del OpenAPI exportado por agent-core.
 *
 * Regenerar tras cada cambio de API:
 *   npm run api:types   (requiere `python scripts/export_openapi.py` en agent-core)
 */
import type { components } from "./schema";

export type Me = components["schemas"]["MeResponse"];
export type TenantOption = components["schemas"]["TenantOption"];
export type TenantPage = components["schemas"]["Page_TenantOption_"];
export type Dashboard = components["schemas"]["DashboardResponse"];
export type Kpi = components["schemas"]["core__api__routers__dashboard__Kpi"];
export type RecentConversation = components["schemas"]["RecentConversation"];
export type BillingSummary = components["schemas"]["BillingSummary"];
export type UsageMetric = components["schemas"]["UsageMetric"];

export type ConversationSummary = components["schemas"]["ConversationSummary"];
export type ConversationDetail = components["schemas"]["ConversationDetail"];
export type MessageItem = components["schemas"]["MessageItem"];
export type MessagesSince = components["schemas"]["MessagesSince"];
export type ConversationConnection = components["schemas"]["ConversationConnection"];
export type ActiveEscalation = components["schemas"]["ActiveEscalation"];
export type ConversationNote = components["schemas"]["ConversationNote"];
export type ConversationPage = components["schemas"]["Page_ConversationSummary_"];

export type PluginSummary = components["schemas"]["PluginSummary"];
export type PluginConfigResponse = components["schemas"]["PluginConfigResponse"];
export type SubscriptionProviderSettings = components["schemas"]["SubscriptionProviderSettings"];

export type EscalationItem = components["schemas"]["EscalationItem"];
export type EscalationPage = components["schemas"]["Page_EscalationItem_"];
export type LeadsResponse = components["schemas"]["LeadsResponse"];
export type CostsResponse = components["schemas"]["CostsResponse"];
export type PlanResponse = components["schemas"]["PlanResponse"];

export type CollaboratorItem = components["schemas"]["CollaboratorItem"];
export type ConnectionItem = components["schemas"]["ConnectionItem"];
export type ConnectionsResponse = components["schemas"]["ConnectionsResponse"];
export type ConnectionsConsole = components["schemas"]["ConnectionsConsole"];
export type PlatformTenant = components["schemas"]["PlatformTenant"];
export type PlatformTenantPage = components["schemas"]["Page_PlatformTenant_"];

export type SettingsResponse = components["schemas"]["SettingsResponse"];
export type WebChatSettings = components["schemas"]["WebChatSettings"];
export type IdentitySettings = components["schemas"]["IdentitySettings"];
export type BotPausedUpdate = components["schemas"]["BotPausedUpdate"];
export type BotPausedState = components["schemas"]["BotPausedState"];
export type BrainSettings = components["schemas"]["BrainSettings"];

// Plantillas por evento (HU-ARCH-13, ADR-0108).
export type MessageTemplatesSettings = components["schemas"]["MessageTemplatesSettings"];
export type EventTemplateEntry = components["schemas"]["EventTemplateEntry"];
export type TenantTemplateItem = components["schemas"]["TenantTemplateItem"];
export type MissingTemplates = components["schemas"]["MissingTemplates"];
export type ApprovedTemplate = components["schemas"]["ApprovedTemplate"];

// Onboarding autoservicio (HU-SH-06, ADR-0124 de agent-core).
export type PrimerosPasos = components["schemas"]["PrimerosPasosResponse"];
export type PasoPrimerosPasos = components["schemas"]["PasoOut"];
export type AcceptInvitationResponse = components["schemas"]["AcceptInvitationResponse"];
export type InvitationItem = components["schemas"]["InvitationItem"];
export type PendingInvitations = components["schemas"]["PendingResponse"];

// Alta automática: interruptor, documentos legales y altas en revisión (HU-SH-07, ADR-0125 de agent-core).
export type VendedorAltas = components["schemas"]["VendedorAltas"];
export type DocumentoLegal = components["schemas"]["DocumentoLegalOut"];
export type AltaAutomatica = components["schemas"]["AltaOut"];
// Checklist de producción real (HU-CONN-07 de agent-core).
export type ReadinessItem = components["schemas"]["ReadinessItem"];
export type ConnectionProduction = components["schemas"]["ConnectionProduction"];
export type PlatformMetaApp = components["schemas"]["PlatformMetaApp"];

/** Búsqueda global (`GET /search`, ADR-0096): la usa la paleta de comandos (HU-DS-05). */
export type SearchResponse = components["schemas"]["SearchResponse"];
export type SearchSection = components["schemas"]["ResultadoSeccion"];
export type SearchItem = components["schemas"]["ItemBusqueda"];

// Centro de pruebas (SPEC-30, HU-QA-03/04)
export type QaCatalogo = components["schemas"]["QaCatalogo"];
export type QaItem = components["schemas"]["QaItem"];
export type QaPaso = components["schemas"]["QaPaso"];
export type QaProgreso = components["schemas"]["QaProgreso"];
export type QaEjecucion = components["schemas"]["QaEjecucion"];
export type QaResultadoPrueba = components["schemas"]["QaResultadoPrueba"];
export type QaAdjunto = components["schemas"]["QaAdjunto"];
export type QaEvento = components["schemas"]["QaEvento"];
export type QaCiclo = components["schemas"]["QaCiclo"];
export type QaConfig = components["schemas"]["QaConfig"];
export type QaTestersOut = components["schemas"]["QaTestersOut"];
export type QaTesterOut = components["schemas"]["QaTesterOut"];
export type QaTesterInvitado = components["schemas"]["QaTesterInvitado"];
export type QaMisDatos = components["schemas"]["QaMisDatos"];
export type QaDatos = components["schemas"]["QaDatos"];
export type QaDatosCuenta = components["schemas"]["QaDatosCuenta"];
export type QaDatosAgentOS = components["schemas"]["QaDatosAgentOS"];
export type AcceptTesterInvitationResponse = components["schemas"]["AcceptTesterInvitationResponse"];

// Mi agente y su data (HU-AOS-47)
export type AgentsOverview = components["schemas"]["AgentsOverview"];
export type AgentOverviewItem = components["schemas"]["AgentOverviewItem"];
export type AgentConversationPage = components["schemas"]["Page_AgentConversation_"];
export type AgentCustomerPage = components["schemas"]["Page_AgentCustomer_"];
export type AgentTaskPage = components["schemas"]["Page_AgentTask_"];
export type AgentRecordPage = components["schemas"]["Page_AgentRecordItem_"];
export type AgentUsage = components["schemas"]["AgentUsage"];

// Editor de agentes desde plantillas (HU-AOS-24).
export type AgentDetail = components["schemas"]["AgentDetail"];
export type AgentDraft = components["schemas"]["AgentDraft"];
export type AgentTemplate = components["schemas"]["AgentTemplate"];
export type AgentTemplatePage = components["schemas"]["Page_AgentTemplate_"];
export type Superpower = components["schemas"]["Superpower"];
export type SuperpowerPage = components["schemas"]["Page_Superpower_"];
export type LlmModel = components["schemas"]["LlmModel"];
export type LlmModelCatalog = components["schemas"]["LlmModelCatalog"];
export type PublishTarget = components["schemas"]["PublishTarget"];
export type PublishTargetPage = components["schemas"]["Page_PublishTarget_"];
export type FromTemplateOut = components["schemas"]["FromTemplateOut"];
export type EditorPublishOut = components["schemas"]["EditorPublishOut"];

// Conocimiento del agente (HU-AOS-49, pack_knowledge).
export type KnowledgeDocument = components["schemas"]["DocumentoOut"];
