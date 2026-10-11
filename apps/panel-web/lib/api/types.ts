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
export type PlatformTenant = components["schemas"]["PlatformTenant"];
export type PlatformTenantPage = components["schemas"]["Page_PlatformTenant_"];

export type SettingsResponse = components["schemas"]["SettingsResponse"];
export type WebChatSettings = components["schemas"]["WebChatSettings"];
export type IdentitySettings = components["schemas"]["IdentitySettings"];
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
