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
// Resumen por agente (ADR-0171): KPIs del negocio, de cada agente y de su módulo.
export type ResumenPorAgente = components["schemas"]["ResumenPorAgente"];
export type AgenteResumen = components["schemas"]["AgenteResumen"];
export type ModuloResumen = components["schemas"]["ModuloOut"];
export type KpiResumen = components["schemas"]["KpiOut"];
export type DestinoResumen = components["schemas"]["DestinoOut"];
export type PuntoActividad = components["schemas"]["PuntoActividadOut"];
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
export type Order = components["schemas"]["OrderOut"];
export type LeadsResponse = components["schemas"]["LeadsResponse"];
export type LeadPerfil = components["schemas"]["LeadPerfilOut"];
export type LeadAgent = components["schemas"]["LeadAgentOut"];
export type LeadAgentData = components["schemas"]["LeadAgentData"];
export type LeadCampoPerfil = components["schemas"]["LeadCampoPerfil"];
export type LeadGeocodificacion = components["schemas"]["LeadGeocodificacion"];

export type LeadGeocodificacionInversa = components["schemas"]["LeadGeocodificacionInversa"];
export type LeadRow = components["schemas"]["LeadRow"];
export type CostsResponse = components["schemas"]["CostsResponse"];
export type PlanResponse = components["schemas"]["PlanResponse"];

export type CollaboratorItem = components["schemas"]["CollaboratorItem"];
export type PackProfile = components["schemas"]["PackProfile"];
export type ConnectionItem = components["schemas"]["ConnectionItem"];
export type ConnectionsResponse = components["schemas"]["ConnectionsResponse"];
export type ConnectionsConsole = components["schemas"]["ConnectionsConsole"];
export type PlatformTenant = components["schemas"]["PlatformTenant"];
export type PlatformTenantPage = components["schemas"]["Page_PlatformTenant_"];
export type TenantCreated = components["schemas"]["TenantCreated"];
export type TenantOwnerInvitation = components["schemas"]["TenantOwnerInvitation"];
export type AgentOSEstado = components["schemas"]["AgentOSEstado"];
export type AgentOSObjetivo = components["schemas"]["AgentOSObjetivo"];
export type AgentOSResultado = components["schemas"]["AgentOSResultado"];

export type SettingsResponse = components["schemas"]["SettingsResponse"];
export type WebChatSettings = components["schemas"]["WebChatSettings"];
export type IdentitySettings = components["schemas"]["IdentitySettings"];
// Catálogo de opciones de configuración (SPEC-37, ADR-0166). Alias con sufijo `Config`: el panel ya
// tiene tipos y componentes locales llamados `Opcion` y `Catalogo`.
export type CatalogoConfig = components["schemas"]["Catalogo"];
export type OpcionConfig = components["schemas"]["Opcion"];
export type ValorPosibleConfig = components["schemas"]["ValorPosible"];
export type BajasSettings = components["schemas"]["BajasSettings"];
export type WawebPolitica = components["schemas"]["WaWebPolicySettings"];
export type BotPausedUpdate = components["schemas"]["BotPausedUpdate"];
export type BotPausedState = components["schemas"]["BotPausedState"];
export type BrainSettings = components["schemas"]["BrainSettings"];

// Multimedia entrante (SPEC-04, ADR-0151). Tipos locales hasta que el backend
// con los endpoints de media esté en `origin/develop` y se regenere el schema.
export type MediaCatalogModel = { id: string; label: string };
export type MediaCatalogProvider = {
  key: string;
  label: string;
  default_model: string;
  models: MediaCatalogModel[];
};
export type MediaAudioSettings = {
  enabled: boolean;
  provider: string;
  model: string;
  has_api_key: boolean;
  using_platform_key: boolean;
};
export type MediaVisionSettings = MediaAudioSettings & { mode: string };
export type MediaSettings = {
  audio: MediaAudioSettings;
  vision: MediaVisionSettings;
  catalog: { audio: MediaCatalogProvider[]; vision: MediaCatalogProvider[] };
};

// Plantillas por evento (HU-ARCH-13, ADR-0108).
export type MessageTemplatesSettings = components["schemas"]["MessageTemplatesSettings"];
export type EventTemplateEntry = components["schemas"]["EventTemplateEntry"];
export type TenantTemplateItem = components["schemas"]["TenantTemplateItem"];
export type MissingTemplates = components["schemas"]["MissingTemplates"];
export type ApprovedTemplate = components["schemas"]["ApprovedTemplate"];

// Plantillas con opciones que ejecutan una tool (SPEC-40, ADR-0172, HU-OPC-06).
export type OpcionesDefinicion = components["schemas"]["Definicion"];
export type OpcionesOpcion = components["schemas"]["OpcionDeLaPlantilla"];
export type OpcionesAccion = components["schemas"]["Accion"];
export type OpcionesAccionDelCatalogo = components["schemas"]["AccionDelCatalogoOut"];
export type OpcionesVariable = components["schemas"]["OpcionesVariableOut"];
export type OpcionesDirectasBandera = components["schemas"]["OpcionesDirectasBandera"];
export type AvisosPorCanalBandera = components["schemas"]["AvisosPorCanalBandera"];
export type OpcionesHallazgo = components["schemas"]["OpcionesHallazgoOut"];
export type OpcionesPlantillaResumen = components["schemas"]["OpcionesPlantillaResumen"];
export type OpcionesPlantilla = components["schemas"]["OpcionesPlantillaOut"];
export type OpcionesVersion = components["schemas"]["OpcionesVersionOut"];
export type OpcionesValidacion = components["schemas"]["OpcionesValidacionOut"];
export type OpcionesVistaPrevia = components["schemas"]["VistaPreviaOpcionesOut"];
export type OpcionesPublicada = components["schemas"]["OpcionesPublicadaOut"];
export type OpcionesPrueba = components["schemas"]["OpcionesPruebaOut"];
export type OpcionesMetaEstado = components["schemas"]["OpcionesMetaEstadoOut"];
export type OpcionesMetaResultado = components["schemas"]["OpcionesMetaOut"];
export type OpcionesMetaPedido = components["schemas"]["OpcionesMetaIn"];
// Probar una plantilla con opciones en el playground, sin Meta (SPEC-40, ADR-0172, pista B).
export type PlaygroundMensaje = components["schemas"]["PlaygroundMensajeOut"];
export type PlaygroundOpcionesResultado = components["schemas"]["PlaygroundOpcionesOut"];
export type PlaygroundToque = components["schemas"]["PlaygroundToqueOut"];
/** Conexión de `GET /admin/meta/health` (la que el diálogo de publicar en Meta ofrece). */
export type HealthConnectionMeta = components["schemas"]["HealthConnection"];

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
export type QaEvolucion = components["schemas"]["QaEvolucion"];
export type QaVersionEvo = components["schemas"]["QaVersionEvo"];
export type QaSeccionEvo = components["schemas"]["QaSeccionEvo"];
export type QaAreaEvo = components["schemas"]["QaAreaEvo"];
export type QaSubseccionEvo = components["schemas"]["QaSubseccionEvo"];
export type QaTestersOut = components["schemas"]["QaTestersOut"];
export type QaTesterOut = components["schemas"]["QaTesterOut"];
export type QaTesterInvitado = components["schemas"]["QaTesterInvitado"];
export type QaMisDatos = components["schemas"]["QaMisDatos"];
export type QaDatos = components["schemas"]["QaDatos"];
export type QaDatosCuenta = components["schemas"]["QaDatosCuenta"];
export type QaDatosAgentOS = components["schemas"]["QaDatosAgentOS"];
export type QaEscenarios = components["schemas"]["QaEscenarios"];
export type QaEscenario = components["schemas"]["QaEscenario"];
export type QaEscenarioCreado = components["schemas"]["QaEscenarioCreado"];
export type QaEscenarioResultado = components["schemas"]["QaEscenarioResultado"];
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
export type Requirement = components["schemas"]["Requirement"];
export type RequirementPage = components["schemas"]["Page_Requirement_"];
export type AgentTemplatePage = components["schemas"]["Page_AgentTemplate_"];
export type Superpower = components["schemas"]["Superpower"];
export type SuperpowerPage = components["schemas"]["Page_Superpower_"];
export type LlmModel = components["schemas"]["LlmModel"];
export type LlmModelCatalog = components["schemas"]["LlmModelCatalog"];
export type PublishTarget = components["schemas"]["PublishTarget"];
export type PublishTargetPage = components["schemas"]["Page_PublishTarget_"];
export type FromTemplateOut = components["schemas"]["FromTemplateOut"];
// Asistente de creación (HU-AOS-48/54, SPEC-39).
export type Question = components["schemas"]["Question"];
export type FromScriptOut = components["schemas"]["FromScriptOut"];
export type EditorPublishOut = components["schemas"]["EditorPublishOut"];

// Conocimiento del agente (HU-AOS-49, pack_knowledge).
export type KnowledgeDocument = components["schemas"]["DocumentoOut"];

// Datos de prueba por agente (HU-QA-10, solo en test).
export type EstadoDatosDePrueba = components["schemas"]["EstadoDatosDePrueba"];
export type LoteGenerado = components["schemas"]["LoteGenerado"];
export type DatosRetirados = components["schemas"]["DatosRetirados"];
// Importar datos existentes por agente (HU-QA-12, solo en test).
export type EstadoImportacion = components["schemas"]["EstadoImportacion"];
export type VistaPreviaImportacion = components["schemas"]["VistaPreviaImportacion"];
export type ImportacionHecha = components["schemas"]["ImportacionHecha"];
/** Estado de los datos de prueba de un módulo (local hasta que `schema.d.ts` lo traiga de develop). */
export type EstadoDatosDePruebaModulo = {
  modulo: string;
  titulo: string;
  disponible: boolean;
  motivo: string | null;
  falta_descripcion: boolean;
  lote: EstadoDatosDePrueba["lote"];
};
/** Campo de un pack editable desde la ficha (ADR-0149). Local hasta que `schema.d.ts` lo traiga de develop. */
export type LeadEditable = {
  plugin_id: string;
  key: string;
  label: string;
  tipo: "opciones" | "texto";
  options?: { value: string; label: string }[];
  max_length: number;
  value?: string | null;
};
export type LeadDetail = components["schemas"]["LeadDetail"] & { editables?: LeadEditable[] };
export type LeadFact = components["schemas"]["LeadFact"];
export type LeadFilter = components["schemas"]["LeadFilter"];
export type LeadNote = components["schemas"]["LeadNote"];
export type TimelineItem = components["schemas"]["TimelineItem"];
export type TimelineResponse = components["schemas"]["TimelineResponse"];

// Acciones sobre un segmento de Clientes y consentimiento (HU-CRM-06, ADR-0150).
export type ConexionDeEnvio = components["schemas"]["ConexionDeEnvioOut"];
export type PlantillaDeEnvio = components["schemas"]["PlantillaDeEnvio"];
export type VistaPreviaEnvio = components["schemas"]["VistaPreviaOut"];
export type EnvioSegmento = components["schemas"]["EnvioOut"];
export type Consentimiento = components["schemas"]["ConsentimientoOut"];

// Administración de suscripciones (SPEC-35, pack_subscriptions).
export type SuscripcionItem = components["schemas"]["SuscripcionItem"];
export type SuscripcionDetalle = components["schemas"]["SuscripcionDetalle"];
export type SuscripcionesPage = components["schemas"]["Page_SuscripcionItem_"];
export type CargoSuscripcion = components["schemas"]["CargoItem"];
export type CargosSuscripcionPage = components["schemas"]["Page_CargoItem_"];
export type ClienteConSuscripcion = components["schemas"]["ClienteConSuscripcion"];
export type ClientesConSuscripcionPage = components["schemas"]["Page_ClienteConSuscripcion_"];
export type MetricasSuscripciones = components["schemas"]["Metricas"];
export type HistorialSuscripcion = components["schemas"]["HistorialItem"];
export type AccionSuscripcionOut = components["schemas"]["AccionOut"];
export type ReenvioLinkOut = components["schemas"]["ReenvioOut"];
export type PagoRegistradoOut = components["schemas"]["PagoRegistradoOut"];
export type MinimoPagoEnLineaOut = components["schemas"]["MinimoPagoEnLineaOut"];
export type AvisoDeCargo = components["schemas"]["AvisoOut"];
export type CohorteSuscripciones = components["schemas"]["CohorteFila"];

// Colaboración entre agentes (HU-AOS-18/26).
export type Link = components["schemas"]["Link"];
export type Graph = components["schemas"]["Graph"];
export type GraphOut = components["schemas"]["GraphOut"];
export type RoutePreview = components["schemas"]["RoutePreview"];
export type AgentSummary = components["schemas"]["AgentSummary"];

// Centro de notificaciones (ADR-0167).
export type NotificacionItem = components["schemas"]["NotificationItem"];
export type NotificacionPagina = components["schemas"]["NotificationPage"];
export type NotificacionDestino = components["schemas"]["NotificationTarget"];
export type NotificacionPreferencias = components["schemas"]["NotificationPreferences"];

// Versiones de una conexión (HU-AOS-14/21/27).
export type ReleaseSummary = components["schemas"]["ReleaseSummary"];
export type ReleaseDiff = components["schemas"]["ReleaseDiff"];
export type Evaluation = components["schemas"]["Evaluation"];
export type EvaluationRequested = components["schemas"]["EvaluationRequested"];
// Prueba con una parte de los clientes (canary, HU-AOS-32).
export type CanaryState = components["schemas"]["CanaryState"];
export type CanaryLane = components["schemas"]["CanaryLane"];
export type CanarySignal = components["schemas"]["CanarySignal"];
export type CanaryIn = components["schemas"]["CanaryIn"];

// Tablero de fiabilidad (HU-AOS-29).
export type ReliabilityResponse = components["schemas"]["ReliabilityResponse"];
export type VerifierRejections = components["schemas"]["VerifierRejections"];
export type VerifierRejection = components["schemas"]["VerifierRejection"];
export type ReliabilityUsage = components["schemas"]["UsageResponse"];
export type ReliabilityEvalRuns = components["schemas"]["EvalRunsResponse"];

// Depurador del turno y «En curso» (HU-AOS-28).
export type TurnDetail = components["schemas"]["TurnDetail"];
export type TurnStep = components["schemas"]["TurnStep"];
export type TurnTaskEvent = components["schemas"]["TurnTaskEvent"];
export type InProgress = components["schemas"]["InProgress"];
export type InProgressTask = components["schemas"]["InProgressTask"];
export type InProgressMissing = components["schemas"]["InProgressMissing"];

/** Agenda del módulo de agendamiento (HU-CAL-08, ADR-0170). */
export type AgendaCalendario = components["schemas"]["CalendarOut"];
export type ListaDeAgendas = components["schemas"]["CalendarListOut"];

// Catálogo unificado de mensajes, de solo lectura (ADR-0178, pista D0).
export type CatalogoDeMensajes = components["schemas"]["CatalogoDeMensajesOut"];
export type MensajeDelCatalogo = components["schemas"]["MensajeDelCatalogo"];
export type FuenteDeMensaje = components["schemas"]["FuenteDeMensaje"];
export type MensajeOmitido = components["schemas"]["MensajeOmitido"];
