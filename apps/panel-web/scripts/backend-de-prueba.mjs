#!/usr/bin/env node
// Backend de prueba para mirar el panel sin agent-core (HU-UI-03).
//
// Sirve `/api/v1/*` con las mismas respuestas ficticias de los tests
// (`lib/testing/fixtures.ts`), así que lo que se ve en el navegador es lo que prueban
// los tests de accesibilidad. Requiere Node >= 23.6 (corre TypeScript sin compilar).
//
//   node scripts/backend-de-prueba.mjs            # escucha en :8765
//   PUERTO=8800 BOT_PAUSADO=1 node scripts/backend-de-prueba.mjs
//   OPCIONES_BANDERA=0 (plantillas con opciones apagadas) · SOLO_LECTURA=1 (quien mira no es el propietario)
//   SIN_CONEXIONES=1 (el negocio no tiene conexión de WhatsApp: «Publicar en Meta» muestra su estado vacío)
//   COLABORADOR=1 (sin permisos de Equipo/Configuración) · TESTER=1 (rol tester): niveles de la Wiki en /ayuda
//   MASTER=1 (quien mira es el admin de plataforma: Tenants con el interruptor de plantillas con opciones)
//   El playground (SPEC-40, pista B2) simula `/admin/playground/{options,tap}` con las plantillas publicadas: cada botón
//   ejecuta una sola vez (el segundo toque es `duplicate`); OPCIONES_BANDERA=0 los apaga (404 por negocio).
//   Avisos por evento (Plantillas → Por evento) y su texto por canal; el interruptor «Avisos por canal» de Tenants (MASTER=1).
//   Asistente por preguntas de Configuración (HU-CFG-10/11): simula vista previa y aplicar con el guion del catálogo de
//   prueba y guarda lo aplicado en memoria (recargar la página lo muestra). ASISTENTE_409=1: el primer «aplicar» responde
//   409 porque «alguien» cambió la calidez en medio · ASISTENTE_422=1: la vista previa rechaza la pregunta de emojis.
//   EMBUDO=1 (Ventas › Clientes › Embudo, HU-CRM-24): 130 leads repartidos en cinco etapas con contadores y sumas de valor;
//   mover una tarjeta cambia la etapa en memoria · EMBUDO=rechazo (el servidor rechaza todo cambio de etapa)
//   RETIRADAS=1 (HU-AOS-59): el negocio de MASTER=1 y el agente Ventas nombran acciones y procedimientos retirados: aviso del
//   master (Tenants › Agent OS), aviso del dueño en la lista de agentes y en el editor (/agentes/<id>/editar); publicar
//   responde el 422 invalid_spec con error.fields. RETIRADAS=limpio: los mismos endpoints, sin nada retirado.
//   PLATAFORMA=403|404|corte|corte-al-guardar (la ruta `/admin/platform/tenants/{id}/opciones-directas` falla así; `corte` = 502)
//
// Luego, en otra terminal:
//   AGENT_CORE_API_URL=http://localhost:8765 npm run start -- -p 3293
// y en el navegador crea la cookie de sesión de prueba (cualquier valor sirve):
//   document.cookie = "panel_session=prueba; path=/"
//
// Las rutas sin fixture responden 404 (la página muestra su estado de error).

import { createServer } from "node:http";

const { RESPUESTAS, accionesDeOpciones, ajustes, dosAgendas, eventosAgenda, listaDeOpciones, me, metaDeVersion, plantillaDeOpciones, variablesDeOpciones, versionesConMeta } =
  await import("../lib/testing/fixtures.ts");

const { CATALOGO_DE_PRUEBA } = await import("../lib/testing/asistente-config.ts");

const puerto = Number(process.env.PUERTO ?? 8765);
const respuestas = { ...RESPUESTAS, "/admin/settings/catalog": CATALOGO_DE_PRUEBA };
if (process.env.BOT_PAUSADO === "1") {
  respuestas["/admin/settings"] = { ...ajustes, identity: { ...ajustes.identity, bot_paused: true } };
}

// Conexiones (HU-UX-09): un número de cada tipo para mirar la lista y la ficha por tipo. Los dos WhatsApp
// oficiales comparten la cuenta de Meta `…aaaa` (aviso «esta cuenta tiene 2 números»).
{
  const META = "00000000-0000-4000-8000-00000000aaaa";
  const uso = { turns: 42, conversations: 9, input_tokens: 12000, output_tokens: 4000, cost_usd: 0.12 };
  const sinUso = { turns: 0, conversations: 0, input_tokens: 0, output_tokens: 0, cost_usd: null };
  const ag = (n, nombre, extra = {}) => ({
    instance_id: `00000000-0000-4000-8000-0000000001f${n}`, agent_id: `00000000-0000-4000-8000-00000000000${n}`, key: nombre.toLowerCase(),
    name: nombre, role: "specialist", is_default: false, enabled: true, priority: 100, release_version: 2, latest_version: 2, ...extra,
  });
  const coord = ag(1, "General", { role: "core", priority: 0 });
  const ventas = ag(2, "Ventas", { is_default: true, release_version: 3, latest_version: 4 });
  const agenda = ag(3, "Agenda", { priority: 200 });
  const fila = (id, extra) => ({
    id, channel: "whatsapp", type_id: "whatsapp_meta", label: "", external_id: "", conversational: true, active: true, is_primary: false,
    created_at: "2026-10-01T12:00:00Z", meta_connection_id: null, health: "ok", pause_scope: "connection", pausable: true,
    coordinator: coord, agents: [], active_release: { id: "00000000-0000-4000-8000-000000000701", number: 7, created_at: "2026-11-01T12:00:00Z" },
    canary_release: null, usage_7d: uso, ...extra,
  });
  const items = [
    fila("00000000-0000-4000-8000-0000000000c1", { label: "WhatsApp ventas", external_id: "+57 300 555 0101", meta_connection_id: META, pause_scope: "meta_account", is_primary: true, agents: [ventas, agenda] }),
    fila("00000000-0000-4000-8000-0000000000c2", { label: "WhatsApp soporte", external_id: "+57 300 555 0102", meta_connection_id: META, pause_scope: "meta_account", health: "degraded", agents: [ag(2, "Ventas", { is_default: true })] }),
    fila("00000000-0000-4000-8000-0000000000c3", { label: "WhatsApp Web", type_id: "whatsapp_waweb", external_id: "573005550103", agents: [ag(3, "Agenda", { is_default: true })] }),
    fila("00000000-0000-4000-8000-0000000000c5", { label: "Chat del sitio", type_id: "webchat", channel: "web", external_id: "cafeaurora.co", agents: [ag(2, "Ventas", { is_default: true })] }),
    fila("00000000-0000-4000-8000-0000000000c6", { label: "Instagram @cafeaurora", type_id: "instagram_meta", channel: "instagram", external_id: "17841400000000000", meta_connection_id: "00000000-0000-4000-8000-00000000dddd", pause_scope: "meta_account", agents: [] , active_release: null, coordinator: null, usage_7d: sinUso }),
    fila("00000000-0000-4000-8000-0000000000c4", { label: "Agenda de Google", type_id: "google_calendar", channel: "", conversational: false, pausable: false, external_id: "agenda@test.example", coordinator: null, active_release: null, usage_7d: sinUso }),
    fila("00000000-0000-4000-8000-0000000000c7", { label: "Correo del negocio", type_id: "email_smtp", channel: "email", conversational: false, pausable: false, external_id: "hola@cafeaurora.co", coordinator: null, active_release: null, usage_7d: sinUso }),
  ];
  respuestas["/admin/connections/console"] = { ...respuestas["/admin/connections/console"], items, total: items.length, runtime: "v3", routing: "active", consistency: { pass_k: 0.92, k: 4 } };
  const instancia = (a) => ({ id: a.instance_id, agent_id: a.agent_id, key: a.key, name: a.name, role: a.role, is_default: a.is_default, priority: a.priority, enabled: a.enabled, latest_version: a.latest_version });
  for (const c of items.filter((x) => x.conversational)) {
    respuestas[`/admin/connections/${c.id}/agents`] = [...(c.coordinator ? [c.coordinator] : []), ...c.agents].map(instancia);
  }
  respuestas["/admin/connections/00000000-0000-4000-8000-0000000000c7/credentials"] = {
    fields: [
      { name: "host", label: "Servidor SMTP", value: "smtp.cafeaurora.co", secret: false, configured: true },
      { name: "username", label: "Usuario", value: "hola@cafeaurora.co", secret: false, configured: true },
      { name: "password", label: "Contraseña", value: null, secret: true, configured: true },
    ],
  };
  respuestas[`/admin/meta/connections/${META}/test-message`] = {
    connection_id: META, status: "connected", phone_number_id: "100200300", display_phone_number: "+57 300 555 0101",
    templates: [], can_send: false, blocked_reason: "Sincroniza las plantillas para elegir una aprobada.",
  };
  respuestas["/admin/meta/waweb"] = { status: "conectado", risk_ok: true, jid: "573005550103@s.whatsapp.net", qr_image: null, last_error: null };
}

// AGENDAS=2: el negocio tiene dos agendas (HU-CAL-08) y el calendario trae una cita de cada una.
if (process.env.AGENDAS === "2") {
  respuestas["/pack/calendar/calendars"] = dosAgendas;
  respuestas["/pack/calendar/events"] = eventosAgenda();
}

// GESTOR_EN_EQUIPO=1: Equipo trae un gestor de cobranza con su perfil (ADR-0176, HU-ACC-07): otro con el
// detalle recortado y uno con una edición que el panel no conoce.
if (process.env.GESTOR_EN_EQUIPO === "1") {
  const perfil = (ref, resumen, edit) => ({ pack: "pack_cobranza", role_id: "gestor", ref_id: ref, etiqueta: "Gestor", resumen, edit });
  const base = { telefono: null, avatar_url: null, role: "colaborador", active: true, is_self: false, is_platform_master: false, permissions: [], links: [{ role: "colaborador", slug: "negocio-de-prueba", name: "Negocio" }] };
  respuestas["/admin/collaborators"] = [
    ...respuestas["/admin/collaborators"],
    { ...base, id: "g-1", email: "gestor@test.example", username: null, nombre: "Gestor Uno", pack_profiles: [perfil("gp-1", { estatus: "activo", carteras: [{ id: "c1", nombre: "Ruta A" }, { id: "c2", nombre: "Ruta B" }], permisos_activos: 9, permisos_total: 14 }, { kind: "cobranza_gestor_permisos", ref_id: "gp-1" })] },
    { ...base, id: "g-2", email: "recortado@test.example", username: null, nombre: null, pack_profiles: [perfil("gp-2", null, null)] },
    { ...base, id: "g-3", email: "desconocido@test.example", username: null, nombre: null, pack_profiles: [perfil("gp-3", { estatus: "suspendido", carteras: [], permisos_activos: 0, permisos_total: 14 }, { kind: "otro_pack_otro_kind", ref_id: "z" })] },
  ];
  respuestas["/pack/cobranza/collectors/gp-1/permissions"] = { catalogo: ["registrar_pago", "ver_cartera", "generar_reporte"], activos: ["registrar_pago", "ver_cartera"] };
}

// SEGURIDAD: dispositivos y alertas de acceso del negocio (HU-ACC-04), con una política por rol.
{
  const cuenta = (id, email, nombre) => ({ id, email, nombre, rol: id === "test-admin-1" ? "owner" : "colaborador" });
  const equipo = (id, c, estado, extra = {}) => ({ id, cuenta: c, device_id_corto: "a1b2c3", device_label: "Samsung A15", plataforma: "android", estado, origen: "autoregistro", rol_al_registrar: "gestor", bloqueo_equipo: false, legacy: false, ultimo_uso_at: "2026-10-30T14:00:00Z", ultima_ip: "190.25.1.10", aprobado_at: null, bloqueado_at: null, motivo: null, created_at: "2026-10-29T09:00:00Z", ...extra });
  respuestas["/access/policy"] = { owner: "abierto", colaborador: "abierto", gestor: "restringido" };
  respuestas["/access/devices"] = {
    items: [
      equipo("d1", cuenta("g-1", "gestor@test.example", "Gestor Uno"), "pendiente"),
      equipo("d2", cuenta("test-admin-1", "duena@test.example", "Dueña"), "activo", { rol_al_registrar: "owner", origen: "politica_abierta", device_label: "Pixel 8", device_id_corto: "9f8e7d" }),
      equipo("d3", cuenta("g-3", "desconocido@test.example", null), "bloqueado", { bloqueado_at: "2026-10-30T10:00:00Z", motivo: "Equipo perdido" }),
    ],
    next_cursor: null,
  };
  respuestas["/access/events"] = {
    items: [
      { id: "e1", tipo: "dispositivo_pendiente", severidad: "aviso", canal: "campo", rol: "gestor", cuenta: cuenta("g-1", "gestor@test.example", "Gestor Uno"), device_id_corto: "a1b2c3", ip: "190.25.1.10", detalle: null, occurred_at: "2026-10-30T14:00:00Z" },
      { id: "e2", tipo: "login_fallido", severidad: "aviso", canal: "panel_apk", rol: null, cuenta: null, device_id_corto: null, ip: "181.1.1.1", detalle: { repeticiones_previas: 3 }, occurred_at: "2026-10-30T13:00:00Z" },
      { id: "e3", tipo: "dispositivo_bloqueado_usado", severidad: "critico", canal: "campo", rol: "gestor", cuenta: cuenta("g-3", "desconocido@test.example", null), device_id_corto: "a1b2c3", ip: "190.25.1.11", detalle: null, occurred_at: "2026-10-30T12:00:00Z" },
    ],
    next_cursor: null,
  };
}

// SOLO_LECTURA=1: quien mira no es el propietario (plantillas con opciones en solo lectura).
if (process.env.SOLO_LECTURA === "1") {
  respuestas["/admin/me"] = { ...me, role: "agent", tenant: { ...me.tenant, role: "agent" } };
}

// COLABORADOR=1: un colaborador sin permisos de Equipo ni Configuración (ve la Wiki solo en su nivel «usuario»).
// TESTER=1: el rol de pruebas (nivel «técnico» en la Wiki).
if (process.env.COLABORADOR === "1") {
  respuestas["/admin/me"] = {
    ...me,
    email: "colaborador@test.example",
    role: "agent",
    tenant: { ...me.tenant, role: "agent" },
    permissions: { dashboard: "read", conversations: "write" },
  };
}
if (process.env.TESTER === "1") respuestas["/admin/me"] = { ...me, role: "tester" };

// SIN_CONEXIONES=1: sin conexiones de Meta (el diálogo de publicar en Meta explica cómo conectar WhatsApp).
if (process.env.SIN_CONEXIONES === "1") respuestas["/admin/meta/health"] = { connections: [] };

// MASTER=1: el admin de plataforma, en un negocio con id uuid (el BFF de plataforma lo exige) y con la lista de
// negocios de Tenants. La bandera de plantillas con opciones por negocio vive en memoria (PUT idempotente).
const NEGOCIO_MASTER = "0b6f6d3e-6a43-4c39-9a52-4b6c1c1e2f10";
const banderasPlataforma = new Map();
if (process.env.MASTER === "1") {
  respuestas["/admin/me"] = { ...me, role: "master", permissions: { ...me.permissions, tenants: "write" }, tenant: { ...me.tenant, id: NEGOCIO_MASTER, name: "Café Aurora", role: "owner" } };
  const fila = (id, name, slug) => ({ id, name, slug, status: "active", created_at: "2026-10-01T10:00:00Z", plan_name: "Básico", plan_status: "active", operational: true });
  respuestas["/admin/platform/tenants"] = {
    items: [fila(NEGOCIO_MASTER, "Café Aurora", "cafe-aurora"), fila("9d1e1a5b-7c1f-4a51-8f0e-2b7d6f1e3c02", "Ferretería Central", "ferreteria-central")],
    page: 1,
    has_more: false,
    total: 2,
  };
}

// RETIRADAS=1|limpio (HU-AOS-59): referencias retiradas en agentes y releases, solo lectura. Reproduce el caso del incidente de
// test: una versión de Ventas nombra `informar_plan` y el procedimiento `pack_commerce.contratar_plan` que el código retiró.
const VENTAS_ID = "00000000-0000-4000-8000-000000000002";
const retiradas = process.env.RETIRADAS;
const MSG_ACCION = "La acción «Informar plan» ya no existe. Quítala de las acciones del agente y vuelve a publicar.";
const MSG_PROC = "El superpoder «Contratar plan» se reemplazó por uno nuevo. Quita el viejo y marca el nuevo en el paso Superpoderes.";
const filaRetirada = (extra) => ({ scope: "version", agent: "ventas", version: 3, path: "tools[3].tool", code: "accion_inexistente", kind: "action", name: "informar_plan", destination: "quitar", message: MSG_ACCION, where: ["conexión …c1 release #4"], ...extra });
const reporteRetiradas = (tenantId) => retiradas === "limpio"
  ? { tenant_id: tenantId, slug: "cafe-aurora", affected: false, agents_affected: 0, releases_affected: 0, rows: [], drafts: [], affected_connections: [], aside: [], error: null }
  : {
      tenant_id: tenantId, slug: "cafe-aurora", affected: true, agents_affected: 2, releases_affected: 1,
      rows: [
        filaRetirada(),
        filaRetirada({ path: "procedures[1].id", code: "procedimiento_inexistente", kind: "procedure", name: "pack_commerce.contratar_plan", destination: "reemplazar por pack_subscriptions.contratar_plan ^2.0", message: MSG_PROC, where: [] }),
        filaRetirada({ agent: "agenda", version: 2, path: "tools[0].tool", message: "La acción «Informar plan» ya no existe. Quítala de las acciones del agente y vuelve a publicar.", where: [] }),
        filaRetirada({ scope: "release", version: null, path: "manifest.procedures[0]", code: "procedimiento_inexistente", kind: "procedure", name: "pack_commerce.contratar_plan", message: MSG_PROC, where: ["conexión …c1 release #4"] }),
      ],
      drafts: [filaRetirada({ scope: "draft", version: null, path: "tools[3].tool", where: [], message: "En el borrador de Ventas sigue la acción «Informar plan», que ya no existe." })],
      affected_connections: [{ connection_id: "00000000-0000-4000-8000-0000000000c1", release: 4 }],
      aside: [
        { connection_id: "00000000-0000-4000-8000-0000000000d1", reason: "borrada", release: 2, rows: [filaRetirada({ scope: "release", version: null, where: [], message: "Una release vieja de una conexión borrada nombra «Informar plan»." })] },
        { connection_id: "00000000-0000-4000-8000-0000000000d2", reason: "playground", release: 3, rows: [filaRetirada({ scope: "release", version: null, where: [], message: "El playground todavía nombra «Informar plan»." })] },
      ],
      error: null,
    };
const avisoVentas = () => retiradas === "limpio"
  ? { agent_id: VENTAS_ID, key: "ventas", name: "Ventas", published_version: 3, in_use: false, blocks_publish: false, notices: [] }
  : {
      agent_id: VENTAS_ID, key: "ventas", name: "Ventas", published_version: 3, in_use: true, blocks_publish: true,
      notices: [
        { scope: "draft", field: "tools[3].tool", kind: "action", name: "informar_plan", message: MSG_ACCION },
        { scope: "draft", field: "procedures[1].id", kind: "procedure", name: "pack_commerce.contratar_plan", message: MSG_PROC },
        { scope: "in_use", field: "procedures[1].id", kind: "procedure", name: "pack_commerce.contratar_plan", message: "En el chat web de tu negocio, tus clientes siguen hablando con una versión que nombra «Contratar plan», que se reemplazó." },
      ],
    };
if (retiradas) {
  respuestas["/admin/agents/retired-references"] = retiradas === "limpio" ? { affected_agents: 0, agents: [] } : { affected_agents: 1, agents: [avisoVentas()] };
  respuestas[`/admin/agents/${VENTAS_ID}/retired-references`] = avisoVentas();
  respuestas[`/admin/agents/${VENTAS_ID}`] = {
    id: VENTAS_ID, key: "ventas", kind: "specialist", contract: "agentspec/3", name: "Ventas", description: "Atiende pedidos y planes.",
    status: "active", latest_version: 3, created_at: "2026-10-20T12:00:00Z",
    draft: {
      lock_version: 1, base_version_id: null, updated_at: "2026-11-03T12:00:00Z",
      content: {
        contract: "agentspec/3", description: "Ventas",
        persona: { inheritConnectionVoice: true, maxLength: 500, forbiddenPhrases: [] },
        model: { primary: "deepseek-flash", temperature: 0.3 },
        procedures: [{ id: "pack_commerce.tomar_pedido", version: "^1.0" }, { id: "pack_commerce.contratar_plan", version: "^1.0" }],
        memory: { shortTermTurns: 30, readScopes: ["customer", "connection", "tenant"], writeNamespaces: [] },
        tools: [{ tool: "buscar_producto", enabled: true }, { tool: "crear_pedido", enabled: true }, { tool: "cotizar", enabled: true }, { tool: "informar_plan", enabled: true }],
      },
    },
    versions: [],
  };
  const pagina = (items) => ({ items, total: items.length, page: 1, page_size: 100, has_more: false });
  respuestas["/admin/agent-superpowers"] = pagina([
    { id: "pack_commerce.tomar_pedido", version: "1.2.0", skill: "pack_commerce", title: "Tomar un pedido", description: "Arma el pedido con el cliente.", phrases: ["quiero comprar", "hacer un pedido", "me lo vendes"] },
  ]);
  respuestas["/admin/agent-models"] = { items: [{ provider: "deepseek", model: "deepseek-flash", input_usd_per_mtok: 0.14, output_usd_per_mtok: 0.28, selectable: true, retired: false }], total: 1, page: 1, page_size: 100, has_more: false, provider: "deepseek", byok_model: null, avg_input_tokens: null, avg_output_tokens: null, sample_turns: 0, min_phrases: 3 };
  respuestas[`/admin/agents/${VENTAS_ID}/publish-targets`] = pagina([{ connection_id: "00000000-0000-4000-8000-0000000000c1", label: "Chat web", channel: "web", installed: true, covers_skills: true, missing_skills: [], active_release_id: null }]);
  respuestas[`/admin/agents/${VENTAS_ID}/requirements`] = pagina([]);
}
const ALIADOS = { habilitado: false };
// Avisos por canal (ADR-0178 D2): su bandera por negocio también vive en memoria (apagada al inicio).
const avisosPorCanal = new Map();
function plataforma(metodo, ruta, cuerpo) {
  const m = /^\/(?:admin|pack\/commerce)\/platform\/tenants\/([^/]+)\/(opciones-directas|avisos-por-canal|agent-os|aliados|retired-references)$/.exec(ruta);
  if (!m) return undefined;
  if (m[2] === "retired-references") return retiradas ? [200, reporteRetiradas(m[1])] : [404, { error: { message: "Sin fixture" } }];
  if (m[2] === "avisos-por-canal") {
    if (process.env.PLATAFORMA === "403") return [403, { error: { code: "forbidden", message: "Solo el admin master." } }];
    if (metodo === "PUT") avisosPorCanal.set(m[1], cuerpo.habilitada === true);
    return [200, { habilitada: avisosPorCanal.get(m[1]) ?? false }];
  }
  if (m[2] !== "opciones-directas") return metodo === "GET" ? [200, m[2] === "aliados" ? ALIADOS : { runtime: "legacy", procedures: false, routing: "off", aos_connection_routing: true, ultimo_cambio: null }] : [200, { ok: true }];
  const falla = process.env.PLATAFORMA;
  if (falla === "403") return [403, { error: { code: "forbidden", message: "Solo el admin master." } }];
  if (falla === "404") return [404, { error: { code: "not_found", message: "El negocio no existe." } }];
  if (falla === "corte") return [502, { error: { message: "Bad gateway" } }];
  if (falla === "corte-al-guardar" && metodo === "PUT") return [502, { error: { message: "Bad gateway" } }];
  if (metodo === "PUT") banderasPlataforma.set(m[1], cuerpo.habilitada === true);
  return [200, { habilitada: banderasPlataforma.get(m[1]) ?? false }];
}

// Plantillas con opciones (SPEC-40, HU-OPC-06), con estado en memoria y un lint mínimo con las reglas
// del backend para ver los hallazgos junto a su campo. OPCIONES_BANDERA=0 apaga la función (404 por negocio).
// Con MASTER=1 la bandera es la del negocio activo, la que mueve el interruptor de Tenants (apagada al inicio).
const bandera = () => (process.env.MASTER === "1" ? banderasPlataforma.get(NEGOCIO_MASTER) === true : process.env.OPCIONES_BANDERA !== "0");
const plantillasOpciones = new Map([
  ["confirmar_cita", structuredClone(plantillaDeOpciones)],
  ...listaDeOpciones.plantillas
    .filter((p) => p.clave !== "confirmar_cita")
    .map((p) => [p.clave, { ...p, borrador: p.estado === "retired" ? plantillaDeOpciones.borrador : null, definicion_vigente: null, versiones: [] }]),
]);
// Una plantilla con una versión en cada estado de Meta, para ver cómo se pintan (HU-OPC-04, HU-OPC-06).
plantillasOpciones.set("demo_estados", {
  ...structuredClone(plantillaDeOpciones),
  clave: "demo_estados",
  nombre: "Demo de estados de Meta",
  version_vigente: 5,
  versiones: structuredClone(versionesConMeta),
});
const enviosOpciones = new Map();
// Publicar en Meta (simulado, sin red): la conexión «…aaaa» publica a la primera; la «…bbbb» falla con un corte la
// primera vez (reintentable) y publica en el reintento; «…eeee» simula un rechazo de Meta. Nada sale de esta máquina.
const intentosMeta = new Map();
function publicarEnMeta(p, versionN, cuerpo) {
  const v = p.versiones.find((x) => x.version_n === versionN);
  if (!v) return errorOpciones(404, "not_found", "No existe esa versión.");
  if (v.retirada_en) return errorOpciones(409, "version_retirada", "Esa versión está retirada: publica una versión nueva.");
  if (!["UTILITY", "MARKETING"].includes(cuerpo.categoria)) {
    return [422, { detail: [{ type: "literal_error", loc: ["body", "categoria"], msg: "Input should be 'UTILITY' or 'MARKETING'", input: cuerpo.categoria }] }];
  }
  const nombre = `${p.clave}_v${versionN}`;
  const clave = `${p.clave}:${versionN}`;
  const resultado = (ok, outcome, reintentable, extra = {}) => ({
    ok, outcome, reintentable, nombre, estado: ok ? "PENDING" : "DRAFT", categoria: cuerpo.categoria,
    message_template_id: "00000000-0000-4000-8000-0000000000bb", meta_template_id: ok ? "1234567890" : null, motivo: null, ...extra,
  });
  if (cuerpo.connection_id.endsWith("bbbb") && !intentosMeta.has(clave)) {
    intentosMeta.set(clave, true);
    v.message_template_id = "00000000-0000-4000-8000-0000000000bb";
    v.meta = metaDeVersion(nombre, "DRAFT", { categoria: cuerpo.categoria, error_de_publicacion: "network_error" });
    return [200, resultado(false, "network_error", true)];
  }
  if (cuerpo.connection_id.endsWith("eeee")) {
    return [200, resultado(false, "meta_rejected", false, { motivo: "Parameter 'example' is invalid." })];
  }
  v.message_template_id = "00000000-0000-4000-8000-0000000000bb";
  v.meta = metaDeVersion(nombre, "PENDING", { categoria: cuerpo.categoria });
  return [200, resultado(true, "published", false)];
}
const hallazgo = (path, code, severity, mensaje) => ({ path, code, severity, mensaje });
function lintOpciones(d) {
  const h = [];
  const largo = (t) => [...(t ?? "")].length;
  if (!d.body?.trim()) h.push(hallazgo("body", "cuerpo_vacio", "error", "El mensaje necesita un cuerpo."));
  if (largo(d.body) > 1024) h.push(hallazgo("body", "cuerpo_largo", "error", `El cuerpo admite 1024 caracteres; tiene ${largo(d.body)}.`));
  if (largo(d.footer) > 60) h.push(hallazgo("footer", "pie_largo", "error", `El pie admite 60 caracteres; tiene ${largo(d.footer)}.`));
  if (!(d.ttl_horas >= 1 && d.ttl_horas <= 720)) h.push(hallazgo("ttl_horas", "ttl_invalido", "error", "La vigencia va de 1 a 720 horas."));
  if (d.opciones.length === 0) h.push(hallazgo("opciones", "sin_opciones", "error", "Agrega al menos una opción."));
  d.opciones.forEach((o, i) => {
    const b = `opciones[${i}]`;
    if (!o.titulo.trim()) h.push(hallazgo(`${b}.titulo`, "titulo_vacio", "error", "La opción necesita un título."));
    if (largo(o.titulo) > 20) h.push(hallazgo(`${b}.titulo`, "titulo_largo", "error", `El título admite 20 caracteres; tiene ${largo(o.titulo)}.`));
    const ficha = accionesDeOpciones.acciones.find((a) => a.tool === o.accion.tool);
    if (!o.accion.tool) h.push(hallazgo(`${b}.accion.tool`, "tool_invalida", "error", "Elige la acción que ejecuta la opción."));
    else if (!ficha) h.push(hallazgo(`${b}.accion.tool`, "tool_inexistente", "error", `La acción «${o.accion.tool}» no existe en este negocio.`));
    else {
      for (const n of ficha.parameters.required ?? [])
        if (!(n in (o.accion.args_fijos ?? {})) && !(n in (o.accion.args_contexto ?? {})))
          h.push(hallazgo(`${b}.accion.args_fijos.${n}`, "arg_requerido_faltante", "error", `«${o.accion.tool}» necesita «${n}»: dale un valor fijo o un dato del contexto.`));
      for (const [n, ruta] of Object.entries(o.accion.args_contexto ?? {}))
        if (!variablesDeOpciones.variables.some((v) => v.ruta === ruta))
          h.push(hallazgo(`${b}.accion.args_contexto.${n}`, "variable_fuera_de_catalogo", "error", `«${ruta}» no es un dato del contexto disponible.`));
      if (!o.accion.confirmar && ficha.confirmacion_obligatoria)
        h.push(hallazgo(`${b}.accion.confirmar`, "confirmacion_obligatoria", "warning", "Esta acción pide la confirmación del cliente aunque no la marques (es sensible o su permiso la exige)."));
    }
    if (!o.respuesta_ok.trim()) h.push(hallazgo(`${b}.respuesta_ok`, "respuesta_vacia", "error", "Escribe lo que verá el cliente."));
    if (!o.respuesta_error.trim()) h.push(hallazgo(`${b}.respuesta_error`, "respuesta_vacia", "error", "Escribe lo que verá el cliente."));
  });
  return h;
}
const muestra = { "cliente.nombre": "Ana", "negocio.nombre": "Mi negocio" };
function vistaOpciones(d) {
  const cuerpo = d.body.replace(/\{([^{}]*)\}/g, (m, r) => muestra[r] ?? "ejemplo");
  const filas = d.opciones.map((o) => ({ id: `opt:${"0".repeat(32)}:${o.id}:${"0".repeat(16)}`, title: o.titulo }));
  const interactivo = d.opciones.length <= 3 ? { type: "button", body: cuerpo, buttons: filas } : { type: "list", body: cuerpo, button: "Ver opciones", rows: filas };
  if (d.footer) interactivo.footer = d.footer;
  return {
    interactivo,
    cabe_en_whatsapp: true,
    componentes_meta: [
      { type: "BODY", text: d.body.replace(/\{([^{}]*)\}/g, (m, r) => `{{${r.replace(".", "_")}}}`) },
      ...(d.footer ? [{ type: "FOOTER", text: d.footer }] : []),
      { type: "BUTTONS", buttons: d.opciones.map((o) => ({ type: "QUICK_REPLY", text: o.titulo })) },
    ],
    cuerpo_meta_renderizado: cuerpo,
    texto_de_respaldo: [cuerpo, "", ...d.opciones.map((o, i) => `${i + 1}. ${o.titulo}`)].join("\n"),
    hallazgos: lintOpciones(d).filter((x) => x.severity === "warning"),
  };
}
const resumenOpciones = (p) => ({
  clave: p.clave, nombre: p.nombre, estado: p.estado, version_vigente: p.version_vigente,
  tiene_borrador_sin_publicar: p.tiene_borrador_sin_publicar, creada_en: p.creada_en, actualizada_en: p.actualizada_en,
});
const errorOpciones = (status, code, message, details) => [status, { error: { code, message, ...(details ? { details } : {}) } }];
function opciones(metodo, partes, cuerpo) {
  if (!bandera()) return errorOpciones(404, "opciones_directas_no_habilitadas", "Las opciones directas no están habilitadas en este negocio.");
  const [primero, segundo] = partes;
  if (!primero) {
    if (metodo === "GET") return [200, { plantillas: [...plantillasOpciones.values()].map(resumenOpciones) }];
    if (plantillasOpciones.has(cuerpo.clave)) return errorOpciones(409, "clave_repetida", "Ya tienes una plantilla con esa clave.");
    const ahora = new Date().toISOString();
    const p = { clave: cuerpo.clave, nombre: cuerpo.nombre ?? "", estado: "draft", version_vigente: null, tiene_borrador_sin_publicar: false, creada_en: ahora, actualizada_en: ahora, borrador: null, definicion_vigente: null, versiones: [] };
    plantillasOpciones.set(p.clave, p);
    return [201, p];
  }
  if (primero === "catalogo-acciones") return [200, accionesDeOpciones];
  if (primero === "catalogo-variables") return [200, variablesDeOpciones];
  if (primero === "validar") {
    const hallazgos = lintOpciones(cuerpo.definicion);
    return [200, { valida: !hallazgos.some((x) => x.severity === "error"), hallazgos }];
  }
  if (primero === "vista-previa") {
    const hallazgos = lintOpciones(cuerpo.definicion);
    return hallazgos.some((x) => x.severity === "error")
      ? errorOpciones(422, "definicion_con_errores", "La definición tiene errores: corrígelos para ver la vista previa.", { hallazgos })
      : [200, vistaOpciones(cuerpo.definicion)];
  }
  const p = plantillasOpciones.get(primero);
  if (!p) return errorOpciones(404, "not_found", "No existe esa plantilla con opciones.");
  const ahora = new Date().toISOString();
  if (!segundo) {
    if (metodo === "DELETE") {
      if (p.estado === "published") return errorOpciones(409, "plantilla_publicada", "Retira la plantilla antes de borrarla.");
      plantillasOpciones.delete(primero);
      return [204, null];
    }
    return [200, p];
  }
  if (segundo === "borrador") {
    p.borrador = cuerpo.definicion;
    if (cuerpo.nombre !== undefined) p.nombre = cuerpo.nombre;
    p.tiene_borrador_sin_publicar = JSON.stringify(p.borrador) !== JSON.stringify(p.definicion_vigente);
    p.actualizada_en = ahora;
    return [200, p];
  }
  if (segundo === "publicar") {
    const hallazgos = lintOpciones(p.borrador);
    if (hallazgos.some((x) => x.severity === "error")) return errorOpciones(422, "definicion_con_errores", "La definición tiene errores.", { hallazgos });
    if (p.estado === "published" && JSON.stringify(p.borrador) === JSON.stringify(p.definicion_vigente)) return errorOpciones(409, "sin_cambios", "El borrador es igual a la versión publicada.");
    p.version_vigente = (p.version_vigente ?? 0) + 1;
    p.definicion_vigente = structuredClone(p.borrador);
    p.estado = "published";
    p.tiene_borrador_sin_publicar = false;
    p.versiones = [{ version_n: p.version_vigente, publicada_en: ahora, retirada_en: null, definition_hash: "c".repeat(64), message_template_id: null, meta: null, vigente: true }, ...p.versiones.map((v) => ({ ...v, vigente: false }))];
    return [201, { clave: p.clave, version_n: p.version_vigente, definition_hash: "c".repeat(64), publicada_en: ahora, message_template_id: null, meta: null, hallazgos }];
  }
  if (segundo === "versiones" && partes[3] === "publicar-en-meta" && metodo === "POST") {
    if (!bandera()) return errorOpciones(404, "opciones_directas_no_habilitadas", "Las opciones directas no están habilitadas en este negocio.");
    return publicarEnMeta(p, Number(partes[2]), cuerpo);
  }
  if (segundo === "retirar") {
    p.estado = "retired";
    return [200, p];
  }
  if (segundo === "enviar-prueba") {
    if (p.estado !== "published") return errorOpciones(409, "no_publicada", "La plantilla no está publicada.");
    if (cuerpo.conversation_id === "test-conv-2") return errorOpciones(409, "sin_plantilla", "No hay plantilla aprobada.", { motivo: "plantilla_no_aprobada" });
    const previo = enviosOpciones.has(cuerpo.clave_idempotencia);
    enviosOpciones.set(cuerpo.clave_idempotencia, true);
    return [200, { enviado: true, ya_enviado: previo, via: "interactivo", ejecucion_directa: true, degradado: false, send_id: "00000000-0000-4000-8000-000000000001" }];
  }
  return errorOpciones(404, "not_found", "Ruta desconocida.");
}

// Playground (SPEC-40, pista B2): `options` guarda en memoria el envío y `tap` lo resuelve sin tool real.
const enviosPlayground = new Map();
function playground(metodo, ruta, cuerpo) {
  const sub = ruta.replace(/^\/admin\/playground/, "");
  if (sub === "" && metodo === "GET") return [200, { turns: [] }];
  if (sub === "/reset") return [204, null];
  if (sub === "/message") return [200, { text: "Hola, soy el asistente de prueba.", image_url: null, escalated: false }];
  if (sub !== "/options" && sub !== "/tap") return undefined;
  if (!bandera()) return errorOpciones(404, "opciones_directas_no_habilitadas", "Las opciones directas no están habilitadas en este negocio.");
  const mensaje = (content, interactive = null) => ({ id: crypto.randomUUID(), direction: "outbound", content, interactive, created_at: new Date().toISOString() });
  if (sub === "/options") {
    const p = plantillasOpciones.get(cuerpo.clave);
    if (!p) return errorOpciones(404, "not_found", "No existe esa plantilla con opciones.");
    if (p.estado !== "published") return errorOpciones(409, "no_publicada", "La plantilla no está publicada.");
    const d = p.definicion_vigente ?? p.borrador;
    const id = crypto.randomUUID();
    const interactivo = vistaOpciones(d).interactivo;
    const filas = interactivo.buttons ?? interactivo.rows;
    filas.forEach((f, i) => (f.id = `opt:${id}:${d.opciones[i].id}`));
    enviosPlayground.set(id, { d, usadas: new Set(), exclusivo: d.exclusivo });
    return [200, { enviado: true, ya_enviado: false, via: "interactivo", ejecucion_directa: true, degradado: false, send_id: id, mensajes: [mensaje(interactivo.body, interactivo)] }];
  }
  if (!/^opt[cn]?:/.test(cuerpo.payload ?? "")) return errorOpciones(422, "payload_invalido", "No es el botón de una plantilla con opciones.");
  const [, id, opcion] = cuerpo.payload.split(":");
  const envio = enviosPlayground.get(id);
  if (!envio) return [200, { outcome: "unknown_send", mensajes: [] }];
  if (envio.usadas.size > 0 && envio.exclusivo) return [200, { outcome: "duplicate", mensajes: [] }];
  envio.usadas.add(opcion);
  const o = envio.d.opciones.find((x) => x.id === opcion);
  return [200, { outcome: "ok", mensajes: [mensaje(o?.respuesta_ok ?? "Listo.")] }];
}

// Búsqueda global de la paleta (HU-DS-05): filtra unos registros fijos por `q`.
const REGISTROS = [
  { seccion: "pack_cobranza:clientes", label: "Clientes de cobranza", id: "k1", tipo: "cliente_cobranza", titulo: "Ana Pérez", subtitulo: "CC 1.020.333" },
  { seccion: "pack_cobranza:promesas", label: "Promesas", id: "p1", tipo: "promesa", titulo: "Ana Pérez", subtitulo: "Promesa de $250.000", extra: { clienteId: "k1" } },
  { seccion: "conversations", label: "Conversaciones", id: "c1", tipo: "conversacion", titulo: "Andrés Gómez", subtitulo: "Conversación" },
];
function buscar(q) {
  const t = q.toLowerCase();
  const porSeccion = new Map();
  for (const { seccion, label, extra = {}, ...item } of REGISTROS) {
    if (!item.titulo.toLowerCase().includes(t)) continue;
    if (!porSeccion.has(seccion)) porSeccion.set(seccion, { seccion, label, items: [] });
    porSeccion.get(seccion).items.push({ ...item, extra });
  }
  return { resultados: [...porSeccion.values()] };
}

// Avisos por evento (HU-ARCH-13) con el texto por canal (ADR-0178 D2): estado en memoria y las validaciones de la API
// que se ven en la pantalla (QR en cobranza, 1000 caracteres, variables del evento). Omitir el campo conserva lo guardado.
const EVENTOS_AVISOS = {
  "subscription.charge_created": { "cliente.nombre": "Nombre del cliente", "cargo.monto": "Monto del cargo" },
  "subscription.charge_reminder": { "cliente.nombre": "Nombre del cliente", "cargo.monto": "Monto del cargo" },
  "subscription.paused": { "cliente.nombre": "Nombre del cliente" },
  "subscription.trial_ending": { "cliente.nombre": "Nombre del cliente" },
  "appointment.confirmed": { "cliente.nombre": "Nombre del cliente", "cita.fecha": "Fecha de la cita" },
  "appointment.reminder": { "cliente.nombre": "Nombre del cliente", "cita.fecha": "Fecha de la cita" },
  "appointment.no_show": { "cliente.nombre": "Nombre del cliente", "cita.fecha": "Fecha de la cita" },
};
const COBRANZA_AVISOS = ["subscription.charge_created", "subscription.charge_reminder", "subscription.paused"];
const TIPOS_DE_TEXTO = ["whatsapp_waweb", "webchat", "messenger_meta", "instagram_meta"];
let mapaAvisos = { "appointment.reminder": { template: "", language: "es", variables: [], fallback_text: "Hola {cliente.nombre}", fallback_text_by_channel: { webchat: "Recordatorio: tu cita es el {cita.fecha}." } } };
function avisosPorEvento(metodo, cuerpo) {
  if (metodo === "PUT") {
    const errores = [];
    const nuevo = {};
    for (const [evento, e] of Object.entries(cuerpo.mapping ?? {})) {
      const previo = mapaAvisos[evento]?.fallback_text_by_channel ?? {};
      const pedido = Object.hasOwn(e, "fallback_text_by_channel");
      const porCanal = {};
      for (const [tipo, texto] of Object.entries(e.fallback_text_by_channel ?? {})) {
        if (!TIPOS_DE_TEXTO.includes(tipo)) errores.push(`Canal sin texto de respaldo: ${tipo}.`);
        else if (tipo === "whatsapp_waweb" && COBRANZA_AVISOS.includes(evento)) errores.push("Los avisos de cobranza no salen por QR.");
        else if (texto.length > 1000) errores.push(`El texto para ${tipo} pasa de 1000 caracteres.`);
        else if (texto.trim()) porCanal[tipo] = texto.trim();
      }
      const final = pedido ? porCanal : previo;
      if (e.template || e.fallback_text.trim() || Object.keys(final).length) {
        nuevo[evento] = { ...e, fallback_text: e.fallback_text.trim(), ...(Object.keys(final).length ? { fallback_text_by_channel: final } : {}) };
      }
    }
    if (errores.length) return [400, { error: { code: "message_templates_invalid", message: `Revisa el mapeo de plantillas. ${errores.join(" ")}` } }];
    mapaAvisos = nuevo;
  }
  return [200, {
    events: Object.entries(EVENTOS_AVISOS).map(([event, variables]) => ({ event, variables })),
    mapping: Object.fromEntries(Object.entries(mapaAvisos).map(([k, v]) => [k, { fallback_text_by_channel: {}, ...v }])),
    templates: [],
  }];
}

// Asistente de Configuración: mismas reglas que `core/config_registro/asistente.py` en pequeño (sin v3).
{
  respuestas["/admin/settings"] = structuredClone(respuestas["/admin/settings"]);
}
let yaVencio = false;
function asistente(metodo, ruta, cuerpo) {
  const m = /^\/admin\/settings\/asistente\/([^/]+)\/(vista-previa|aplicar)$/.exec(ruta);
  if (!m || metodo !== "POST") return null;
  const [, seccion, accion] = m;
  const catalogo = respuestas["/admin/settings/catalog"];
  const guion = catalogo.asistente.find((g) => g.seccion === seccion);
  if (!guion) return [404, { error: { code: "not_found", message: `Sección desconocida: «${seccion}».` } }];
  const dadas = cuerpo.respuestas ?? {};
  const errores = {};
  for (const [id, valor] of Object.entries(dadas)) {
    const pregunta = guion.preguntas.find((p) => p.id === id);
    const ids = new Set((pregunta?.opciones ?? []).map((o) => o.id));
    if (!pregunta) errores[id] = "Esta pregunta no existe en esta sección.";
    else if (pregunta.tipo === "una" ? !ids.has(valor) : !Array.isArray(valor) || !valor.every((v) => ids.has(v))) errores[id] = "Elige una de las opciones.";
  }
  if (process.env.ASISTENTE_422 === "1" && "emojis" in dadas) errores.emojis = "Esta opción ya no está disponible.";
  if (Object.keys(errores).length) return [422, { error: { code: "validation_error", message: "Revisa las respuestas marcadas.", fields: errores } }];

  const identidad = respuestas["/admin/settings"].identity;
  const propuestos = {};
  for (const pregunta of guion.preguntas) {
    if (!(pregunta.id in dadas)) continue;
    if (pregunta.tipo === "una") Object.assign(propuestos, pregunta.opciones.find((o) => o.id === dadas[pregunta.id]).cambios);
    else {
      const claves = new Set(pregunta.opciones.flatMap((o) => Object.keys(o.cambios)));
      for (const clave of claves) {
        const conocidas = pregunta.opciones.flatMap((o) => o.cambios[clave] ?? []);
        const propias = (identidad[clave] ?? []).filter((v) => !conocidas.includes(v));
        const elegidas = pregunta.opciones.filter((o) => dadas[pregunta.id].includes(o.id)).flatMap((o) => o.cambios[clave] ?? []);
        propuestos[clave] = [...new Set([...propias, ...elegidas])];
      }
    }
  }
  const omitidos = [];
  const estado = { ...identidad, ...propuestos };
  for (const clave of Object.keys(propuestos)) {
    const op = catalogo.opciones.find((o) => o.clave === clave);
    if (op?.depende_de?.condicion === "no_vacia" && !(estado[op.depende_de.clave] ?? []).length) {
      omitidos.push({ clave, etiqueta: op.etiqueta, motivo: op.depende_de.motivo });
      delete propuestos[clave];
    }
  }
  const cambios = Object.entries(propuestos)
    .filter(([clave, nuevo]) => JSON.stringify(identidad[clave]) !== JSON.stringify(nuevo))
    .map(([clave, nuevo]) => {
      const antes = identidad[clave];
      const vacio = antes == null || antes === "" || antes === 0 || (Array.isArray(antes) && antes.length === 0);
      return { clave, etiqueta: catalogo.opciones.find((o) => o.clave === clave)?.etiqueta ?? clave, actual: antes, propuesto: nuevo, editado_a_mano: !vacio };
    });
  const huella = JSON.stringify(cambios.map((c) => [c.clave, c.propuesto])).length.toString(36) + cambios.map((c) => c.clave.length + JSON.stringify(c.propuesto).length).join("-");
  const propuesta = { seccion, cambios, omitidos, huella };
  if (accion === "vista-previa") return [200, propuesta];
  if (process.env.ASISTENTE_409 === "1" && !yaVencio) {
    yaVencio = true;
    identidad.persona_warmth = (identidad.persona_warmth ?? 3) + 1;
    return [409, { error: { code: "conflict", message: "La configuración cambió mientras decidías: revisa los cambios de nuevo." } }];
  }
  if (huella !== cuerpo.huella) return [409, { error: { code: "conflict", message: "La configuración cambió mientras decidías: revisa los cambios de nuevo." } }];
  for (const c of cambios) identidad[c.clave] = c.propuesto;
  return [200, propuesta];
}


// EMBUDO: leads de Ventas por etapa (HU-CRM-24). `/admin/leads` filtra por `estado_lead`, pagina y devuelve los
// contadores y las sumas de valor; el PATCH del pack cambia la etapa en memoria (o la rechaza con EMBUDO=rechazo).
const ETAPAS_EMBUDO = [
  { value: "nuevo", label: "Nuevo" },
  { value: "calificado", label: "Calificado" },
  { value: "contactado", label: "Contactado" },
  { value: "convertido", label: "Convertido" },
  { value: "perdido", label: "Perdido" },
];
const leadsDeEmbudo = [];
if (process.env.EMBUDO) {
  const { leads } = await import("../lib/testing/fixtures.ts");
  const plantilla = leads.items[0];
  const reparto = { nuevo: 120, calificado: 6, contactado: 4, convertido: 3, perdido: 2 };
  let n = 0;
  for (const [etapa, cuantos] of Object.entries(reparto)) {
    for (let i = 0; i < cuantos; i++, n++) {
      leadsDeEmbudo.push({
        ...plantilla,
        id: `lead-${n}`,
        perfil: { ...plantilla.perfil, nombre_visible: `Cliente ${String(n + 1).padStart(3, "0")}` },
        agentes: ["general", "ventas"],
        ultima_actividad: new Date(Date.now() - n * 3_600_000).toISOString(),
        extras: {
          estado_lead: etapa,
          puntaje: 20 + (n % 70),
          valor_estimado: n % 3 === 0 ? null : 50000 * (1 + (n % 9)),
          ...(n % 7 === 0 ? { seguimiento_en: "2026-10-30T10:00:00+00:00", seguimiento_estado: "vencidos", seguimiento_nota: "Llamar" } : {}),
        },
      });
    }
  }
}
const etapaDeEmbudo = (l) => l.extras.estado_lead;
function listaDeEmbudo(url) {
  const pedida = url.searchParams.getAll("filtro").find((f) => f.startsWith("estado_lead:"))?.slice("estado_lead:".length);
  const porPagina = Number(url.searchParams.get("page_size") ?? 20);
  const pagina = Number(url.searchParams.get("page") ?? 1);
  const filtrados = leadsDeEmbudo.filter((l) => !pedida || etapaDeEmbudo(l) === pedida);
  const counts = Object.fromEntries(ETAPAS_EMBUDO.map((e) => [e.value, leadsDeEmbudo.filter((l) => etapaDeEmbudo(l) === e.value).length]));
  const sumas = Object.fromEntries(ETAPAS_EMBUDO.map((e) => [e.value, leadsDeEmbudo.filter((l) => etapaDeEmbudo(l) === e.value).reduce((t, l) => t + (l.extras.valor_estimado ?? 0), 0)]));
  const faceta = { key: "estado_lead", counts, sin_valor: 0, total: leadsDeEmbudo.length, ...(url.searchParams.get("resumen") === "valor" ? { sumas: { ...sumas, sin_valor: 0 } } : {}) };
  return {
    items: filtrados.slice((pagina - 1) * porPagina, pagina * porPagina),
    total: filtrados.length,
    page: pagina,
    page_size: porPagina,
    has_more: pagina * porPagina < filtrados.length,
    agents: [{ key: "ventas", name: "Ventas", icon: "shopping-cart", columns: [{ key: "estado_lead", label: "Estado del lead" }, { key: "puntaje", label: "Puntaje" }, { key: "valor_estimado", label: "Valor estimado" }] }],
    filters: [
      { key: "estado_lead", label: "Estado del lead", options: ETAPAS_EMBUDO },
      { key: "motivo_perdida", label: "Motivo de pérdida", options: [{ value: "precio", label: "Precio" }, { value: "sin_respuesta", label: "Sin respuesta" }, { value: "sin_motivo", label: "Sin motivo registrado" }] },
    ],
    facetas: url.searchParams.getAll("facetas").includes("estado_lead") ? [faceta] : [],
  };
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const ruta = url.pathname.replace(/^\/api\/v1/, "");
  res.setHeader("Content-Type", "application/json");
  if (process.env.EMBUDO && ruta === "/admin/leads") {
    res.end(JSON.stringify(listaDeEmbudo(url)));
    return;
  }
  const cambioDeEtapa = ruta.match(/^\/admin\/leads\/([^/]+)\/pack\/[^/]+$/);
  if (process.env.EMBUDO && cambioDeEtapa && req.method === "PATCH") {
    let texto = "";
    for await (const trozo of req) texto += trozo;
    if (process.env.EMBUDO === "rechazo") {
      res.statusCode = 409;
      res.end(JSON.stringify({ error: { code: "conflict", message: "Solo una persona puede reabrir un lead perdido." } }));
      return;
    }
    const lead = leadsDeEmbudo.find((l) => l.id === decodeURIComponent(cambioDeEtapa[1]));
    const valores = JSON.parse(texto || "{}").valores ?? {};
    if (lead && valores.estado_lead) lead.extras.estado_lead = valores.estado_lead;
    res.end(JSON.stringify({}));
    return;
  }
  if (ruta === "/plantillas-opciones" || ruta.startsWith("/plantillas-opciones/")) {
    let texto = "";
    for await (const trozo of req) texto += trozo;
    const [estado, cuerpo] = opciones(req.method ?? "GET", ruta.split("/").slice(2), texto ? JSON.parse(texto) : {});
    res.statusCode = estado;
    res.end(cuerpo === null ? undefined : JSON.stringify(cuerpo));
    return;
  }
  if (retiradas === "1" && req.method === "POST" && ruta === `/admin/agents/${VENTAS_ID}/publish`) {
    res.statusCode = 422;
    res.end(JSON.stringify({ error: { code: "invalid_spec", message: "Tu agente nombra 2 cosas que ya no existen. Revisa los textos junto a cada control.", fields: { "tools[3].tool": MSG_ACCION, "procedures[1].id": MSG_PROC }, details: { retired_references: [{ field: "tools[3].tool", message: MSG_ACCION }, { field: "procedures[1].id", message: MSG_PROC }] } } }));
    return;
  }
  if (ruta === "/admin/playground" || ruta.startsWith("/admin/playground/")) {
    let texto = "";
    for await (const trozo of req) texto += trozo;
    const r = playground(req.method ?? "GET", ruta, texto ? JSON.parse(texto) : {});
    if (r) {
      res.statusCode = r[0];
      res.end(r[1] === null ? undefined : JSON.stringify(r[1]));
      return;
    }
  }
  if (ruta.startsWith("/admin/settings/asistente/")) {
    let texto = "";
    for await (const trozo of req) texto += trozo;
    const r = asistente(req.method ?? "GET", ruta, texto ? JSON.parse(texto) : {});
    if (r) {
      res.statusCode = r[0];
      res.end(JSON.stringify(r[1]));
      return;
    }
  }
  if (ruta === "/admin/settings/message-templates") {
    let texto = "";
    for await (const trozo of req) texto += trozo;
    const r = avisosPorEvento(req.method ?? "GET", texto ? JSON.parse(texto) : {});
    res.statusCode = r[0];
    res.end(JSON.stringify(r[1]));
    return;
  }
  if (ruta.includes("/platform/tenants/")) {
    let texto = "";
    for await (const trozo of req) texto += trozo;
    const r = plataforma(req.method ?? "GET", ruta, texto ? JSON.parse(texto) : {});
    if (r) {
      res.statusCode = r[0];
      res.end(JSON.stringify(r[1]));
      return;
    }
  }
  const cuerpo =
    req.method !== "GET" ? { ok: true } : ruta === "/search" ? buscar(url.searchParams.get("q") ?? "") : respuestas[ruta];
  if (cuerpo === undefined) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: { message: `Sin fixture para ${ruta}` } }));
    return;
  }
  res.end(JSON.stringify(cuerpo));
}).listen(puerto, () => {
  console.log(`backend de prueba en http://localhost:${puerto} (${Object.keys(respuestas).length} rutas)`);
});
