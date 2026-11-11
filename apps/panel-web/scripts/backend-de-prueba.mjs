#!/usr/bin/env node
// Backend de prueba para mirar el panel sin agent-core (HU-UI-03).
//
// Sirve `/api/v1/*` con las mismas respuestas ficticias de los tests
// (`lib/testing/fixtures.ts`), así que lo que se ve en el navegador es lo que prueban
// los tests de accesibilidad. Requiere Node >= 23.6 (corre TypeScript sin compilar).
//
//   node scripts/backend-de-prueba.mjs            # escucha en :8765
//   PUERTO=8800 BOT_PAUSADO=1 node scripts/backend-de-prueba.mjs
//   COBRANZA=1 (negocio con Cobranza en marcha: carteras, ruta, préstamos, promesas y auditoría)
//   COMERCIO=1 (Ventas con catálogo, variantes, categorías, promociones, pedidos en todos los estados y dos aliados)
//   CONSUMO=1 (Consumo y plan: crédito al 84 %, un período por pagar, pagos, cuatro planes y costos del mes con Meta)
//   AGENTES=1 (toda la sección Agentes con datos: incluye FICHA_AGENTE=1; para el editor, sumar RETIRADAS=limpio)
//   PLATAFORMA=1 (con MASTER=1: App de Meta, requisitos de Embedded Signup y alta automática con documentos y altas en revisión)
//   SUSCRIPCIONES=1 (Suscripciones con datos: todos los estados, cuatro planes, cobros, mora, avisos y métricas)
//   PRUEBAS=1 (Plataforma › Pruebas con catálogo, ejecución propia, informes, ciclos, evolución, checklists, datos y testers)
//   CONEXIONES=1 (Conexiones con datos en todas sus vistas: Messenger, números, plantillas, versiones, costos y altas)
//   OPCIONES_BANDERA=0 (plantillas con opciones apagadas) · SOLO_LECTURA=1 (quien mira no es el propietario)
//   SIN_CONEXIONES=1 (el negocio no tiene conexión de WhatsApp: «Publicar en Meta» muestra su estado vacío)
//   SESION_REAL=1 (sin cookie de sesión, `/admin/me` responde 401: deja ver el login)
//   BIENVENIDA=1 (asistente de primer uso en curso; con AGENTES=1, las plantillas de agente)
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

const { RESPUESTAS, accionesDeOpciones, ajustes, conversacionesDeAgente, dosAgendas, eventosAgenda, listaDeOpciones, me, metaDeVersion, plantillaDeOpciones, variablesDeOpciones, versionesConMeta } =
  await import("../lib/testing/fixtures.ts");

const { CATALOGO_DE_PRUEBA } = await import("../lib/testing/asistente-config.ts");

const puerto = Number(process.env.PUERTO ?? 8765);
const respuestas = { ...RESPUESTAS, "/admin/settings/catalog": CATALOGO_DE_PRUEBA };
// COBRANZA=1: un negocio con Cobranza en marcha (carteras, ruta, cliente con préstamo, promesas, auditoría).
if (process.env.COBRANZA === "1") {
  const dia = (n) => new Date(Date.now() - 5 * 3600_000 + n * 86_400_000).toISOString().slice(0, 10);
  const C = "/pack/cobranza";
  const perms = respuestas["/admin/me"].permissions ?? {};
  respuestas["/admin/me"] = { ...respuestas["/admin/me"], permissions: { ...perms, "pack_cobranza:resumen": "write", "pack_cobranza:carteras": "write", "pack_cobranza:clientes": "write", "pack_cobranza:cobros": "write", "pack_cobranza:promesas": "write", "pack_cobranza:reportes": "write", "pack_cobranza:gestores": "write", "pack_cobranza:auditoria": "write", "pack_cobranza:monitoreo": "write", "pack_cobranza:reglas": "write" } };
  respuestas["/admin/plugins"] = [...respuestas["/admin/plugins"], { ...respuestas["/admin/plugins"][0], id: "pack_cobranza", name: "pack_cobranza", display_name: "Cobranza", enabled_for_tenant: true }];
  const carteras = [
    { id: "c1", nombre: "Ruta Centro", descripcion: null, gestor: "Pedro Gestor", gestor_id: "g1", tipo_interes: 20, num_cuotas: 24, moneda: "COP", estatus: "activo", costo_cobro: 0 },
    { id: "c2", nombre: "Ruta Norte", descripcion: "Barrios del norte", gestor: "Marta Gestora", gestor_id: "g2", tipo_interes: 18, num_cuotas: 30, moneda: "COP", estatus: "activo", costo_cobro: 0 },
    { id: "c3", nombre: "Comerciantes Plaza", descripcion: null, gestor: null, gestor_id: null, tipo_interes: 15, num_cuotas: 12, moneda: "COP", estatus: "inactivo", costo_cobro: 0 },
  ];
  respuestas[`${C}/portfolios`] = carteras;
  respuestas[`${C}/collectors`] = [{ id: "g1", nombre: "Pedro Gestor", correo: "pedro@prueba.example", telefono: "+57 300 000 0011", codigo: "G01", estatus: "activo" }, { id: "g2", nombre: "Marta Gestora", correo: null, telefono: "+57 300 000 0012", codigo: "G02", estatus: "activo" }, { id: "g3", nombre: "Julián Suplente", correo: "julian@prueba.example", telefono: null, codigo: "G03", estatus: "inactivo" }];
  const liq = [{ cartera: "Ruta Centro", fecha: "2026-11-01", periodo: "Octubre 2026", cobrado: 8120000, gastos: 410000, comision: 812000 }, { cartera: "Ruta Centro", fecha: "2026-10-01", periodo: "Septiembre 2026", cobrado: 7640000, gastos: 380000, comision: 764000 }];
  respuestas[`${C}/portfolios/c1`] = { ...carteras[0], clientes: 64, prestamos: 52, saldo: 21400000, mora: 2680000, cobrado_30d: 8120000, gastos_total: 410000, reportes_diarios: [{ fecha: "2026-11-08", cobrado: 420000, prestado: 300000, visitados: 18, sin_pago: 4, inicio: "08:12", fin: "16:40" }, { fecha: "2026-11-07", cobrado: 515000, prestado: 0, visitados: 21, sin_pago: 2, inicio: "07:55", fin: "17:05" }], caja: { saldo_inicial: 2000000, saldo_actual: 3185000, actualizado: "2026-11-08 17:10" }, liquidaciones: liq, inyecciones: [{ fecha: "2026-10-12", valor: 1000000, comentario: "Aporte del dueño", estado: "activa" }], gastos: [{ id: "e1", fecha: "2026-11-08", descripcion: "Gasolina", valor: 45000, aprobado: false }, { id: "e2", fecha: "2026-11-05", descripcion: "Almuerzo de ruta", valor: 18000, aprobado: true }], estadisticas: [{ fecha: "2026-11-08", datos: { conteos: { visitas: 18, pagos: 14 }, cobrado: 420000, caja_final: 3185000 } }] };
  respuestas[`${C}/portfolios/c1/config`] = { values: {} };
  respuestas[`${C}/portfolios/c1/notes`] = [{ id: "n1", nota: "Revisar a los clientes del barrio Prado antes del viernes.", fecha: "2026-11-07 14:00", autor: "Dueña" }];
  respuestas[`${C}/portfolios/c1/route`] = { clientes: [{ id: "k1", cliente: "Ana Pérez", saldo: 450000, mora: 12, riesgo: "rojo" }, { id: "k2", cliente: "Luis Gómez", saldo: 280000, mora: 0, riesgo: "blanco" }, { id: "k3", cliente: "Marta Ruiz", saldo: 910000, mora: 3, riesgo: "azul" }, { id: "k4", cliente: "Carlos Díaz", saldo: 120000, mora: 0, riesgo: "blanco" }], plan: { orden: ["k3", "k1", "k4", "k2"], distancia_km: 14.2, tiempo_min: 95, fecha: dia(0) } };
  const cli = (id, nombre, apellido, t, nro, neg, tope, r) => ({ id, nombre, apellido, telefono: t, tipo_documento: "CC", numero_documento: nro, negocio: neg, tope_maximo_deuda: tope, color_riesgo: r, cartera: "Ruta Centro", cartera_id: "c1" });
  respuestas[`${C}/clients`] = [cli("k1", "Ana", "Pérez", "+57 300 000 0001", "1.020.333", "Tienda La Esquina", 1500000, "rojo"), cli("k2", "Luis", "Gómez", "+57 300 000 0002", "79.455.120", "", 0, "blanco"), cli("k3", "Marta", "Ruiz", "+57 300 000 0003", "43.100.782", "Peluquería Marta", 2000000, "azul"), cli("k4", "Carlos", "Díaz", "", "", "", 0, "blanco")];
  const cuotas = Array.from({ length: 12 }, (_, i) => ({ id: `q${i + 1}`, numero: i + 1, valor: 50000, vence: `2026-${String((i % 12) + 1).padStart(2, "0")}-15`, estatus: i < 7 ? "pagada" : i < 9 ? "atrasada" : "pendiente" }));
  respuestas[`${C}/clients/k1`] = { cliente: { ...cli("k1", "Ana", "Pérez", "+57 300 000 0001", "1.020.333", "Tienda La Esquina", 1500000, "rojo") }, prestamos: [{ id: "p1", valor: 500000, saldo: 250000, num_cuotas: 12, tipo_interes: 20, fecha_otorgado: "2026-01-10", estatus: "vigente", cuotas }], movimientos: [{ id: "m1", tipo: "pago", fecha: "2026-10-15 15:00", valor: 50000, metodo: "efectivo" }, { id: "m2", tipo: "abono", fecha: "2026-09-20 16:20", valor: 20000, metodo: "nequi" }], cambios: [{ id: "x1", campos_propuestos: { telefono_whatsapp: "+57 300 000 0099" }, estado: "pendiente", solicitado_por: "Pedro Gestor", fecha: "2026-11-08 17:10" }] };
  respuestas[`${C}/payments`] = [{ id: "pg1", cliente: "Ana Pérez", valor: 50000, metodo_pago: "efectivo", registrado_por: "Pedro Gestor", fecha_hora: "2026-11-09T15:12:00Z" }, { id: "pg2", cliente: "Marta Ruiz", valor: 120000, metodo_pago: "nequi", registrado_por: null, fecha_hora: "2026-11-09T14:02:00Z" }, { id: "pg3", cliente: "Luis Gómez", valor: 30000, metodo_pago: "efectivo", registrado_por: "Marta Gestora", fecha_hora: "2026-11-08T20:40:00Z" }];
  respuestas[`${C}/promises`] = [
    { id: "pr1", cliente: "Ana Pérez", fecha_prometida: dia(0), valor_prometido: 250000, estado: "pendiente", tipo: "promesa", creado_por: "ia", alcance: "vencido" },
    { id: "pr2", cliente: "Marta Ruiz", fecha_prometida: dia(1), valor_prometido: 120000, estado: "pendiente", tipo: "promesa", creado_por: "gestor", alcance: "saldo_total" },
    { id: "pr5", cliente: "Elena Vargas", fecha_prometida: dia(30), valor_prometido: 200000, estado: "pendiente", tipo: "refinanciacion", creado_por: "propietario", alcance: null },
    { id: "pr3", cliente: "Luis Gómez", fecha_prometida: dia(-7), valor_prometido: 80000, estado: "pendiente", tipo: "promesa", creado_por: "ia", alcance: "vencido" },
    { id: "pr4", cliente: "Carlos Díaz", fecha_prometida: dia(-10), valor_prometido: 60000, estado: "cumplida", tipo: "promesa", creado_por: "ia", alcance: "vencido" },
    { id: "pr6", cliente: "Jorge Ríos", fecha_prometida: dia(-12), valor_prometido: 90000, estado: "incumplida", tipo: "promesa", creado_por: "gestor", alcance: null },
  ];
  respuestas[`${C}/reports`] = { filas: [{ cartera: "Ruta Centro", clientes: 64, prestamos: 52, saldo: 21400000, vencidas: 31, cobrado: 8120000, caja: 3185000, gastos: 410000 }, { cartera: "Ruta Norte", clientes: 58, prestamos: 49, saldo: 19250000, vencidas: 22, cobrado: 6480000, caja: 1940000, gastos: 520000 }, { cartera: "Comerciantes Plaza", clientes: 20, prestamos: 17, saldo: 7700000, vencidas: 9, cobrado: 1890000, caja: 610000, gastos: 300000 }], liquidaciones: liq };
  respuestas[`${C}/audit`] = { entidades: ["cuota", "pago", "promesa"], operaciones: ["crear", "editar", "eliminar"], filas: [{ fecha: "2026-11-09 10:12", entidad: "cuota", entidad_id: "a1f3c2d4", operacion: "editar", antes: { valor_esperado: 50000, estatus: "pendiente" }, despues: { valor_esperado: 45000, estatus: "pendiente" }, actor: "propietario", motivo: "Acuerdo con el cliente" }, { fecha: "2026-11-08 18:30", entidad: "pago", entidad_id: "77bb91e0", operacion: "eliminar", antes: { valor: 30000 }, despues: null, actor: "gestor", motivo: "" }] };
  respuestas[`${C}/monitoring`] = { conversaciones: 86, escalaciones: 3, promesas_pendientes: 12, promesas_cumplidas: 34, promesas_incumplidas: 5 };
  respuestas[`${C}/rules`] = { max_dias_prorroga: 7, min_abono_pct: 20, max_reprogramaciones: 2, umbral_saldo_autonomo: 500000, alcance_promesa: "ambos" };
}
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
    id, channel: "whatsapp", type_id: "whatsapp_meta", label: "", external_id: "", display_phone_number: null, conversational: true, active: true, is_primary: false,
    created_at: "2026-10-01T12:00:00Z", meta_connection_id: null, health: "ok", pause_scope: "connection", pausable: true,
    coordinator: coord, agents: [], active_release: { id: "00000000-0000-4000-8000-000000000701", number: 7, created_at: "2026-11-01T12:00:00Z" },
    canary_release: null, usage_7d: uso, ...extra,
  });
  const items = [
    fila("00000000-0000-4000-8000-0000000000c1", { label: "WhatsApp ventas", external_id: "100200300400500", display_phone_number: "+57 300 5550101", meta_connection_id: META, pause_scope: "meta_account", is_primary: true, agents: [ventas, agenda] }),
    fila("00000000-0000-4000-8000-0000000000c2", { label: "WhatsApp soporte", external_id: "100200300400501", display_phone_number: "+57 300 5550102", meta_connection_id: META, pause_scope: "meta_account", health: "degraded", agents: [ag(2, "Ventas", { is_default: true })] }),
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

// CONEXIONES=1: Conexiones con datos en todas sus vistas (rediseño CON-01..28): la cuenta de Meta con dos números
// (uno sin registrar), plantillas en tres estados, versiones con historial, costos, producción y los catálogos de alta.
if (process.env.CONEXIONES === "1") {
  const M = "00000000-0000-4000-8000-00000000aaaa";
  const C1 = "00000000-0000-4000-8000-0000000000c1";
  const consola = respuestas["/admin/connections/console"];
  const base = consola.items.find((x) => x.id === C1);
  respuestas["/admin/connections/console"] = {
    ...consola,
    items: [
      ...consola.items,
      { ...base, id: "00000000-0000-4000-8000-0000000000c8", label: "Messenger Café Aurora", type_id: "messenger_meta", channel: "messenger", external_id: "Café Aurora", meta_connection_id: "00000000-0000-4000-8000-00000000eeee", is_primary: false, agents: [] },
    ],
  };
  respuestas["/admin/meta/webhooks"] = { subscriptions: [{ connection_id: M, origin: "embedded_signup", uses_platform_app: true, can_register: true, channel: "whatsapp", object: "whatsapp_business_account", meta_app_id: "1234567890", callback_url: "https://api.test.example/webhook/meta", active: true, fields: ["messages", "message_template_status_update"], last_error: null }] };
  respuestas[`/admin/meta/connections/${M}/production`] = { run_id: "r1", status: "done", ready: false, environment: "production", channel: "whatsapp", requested_at: "2026-11-09T12:00:00Z", started_at: "2026-11-09T12:00:01Z", finished_at: "2026-11-09T12:00:09Z", error: null, items: [
    { key: "token_valid", label: "Permiso de acceso a Meta", ok: true, detail: null, repair_action: null, checked_at: "2026-11-09T12:00:05Z" },
    { key: "webhook_subscribed", label: "Recibe mensajes de Meta", ok: true, detail: null, repair_action: null, checked_at: "2026-11-09T12:00:06Z" },
    { key: "billing", label: "Método de pago en Meta", ok: false, detail: "Agrega una tarjeta en WhatsApp Manager.", repair_action: null, checked_at: "2026-11-09T12:00:07Z" },
  ] };
  respuestas[`/admin/meta/connections/${M}/promotion`] = { connection_id: M, environment: "sandbox", status: "connected", status_reason: null, meta_app_id: "1234567890", production_connection_id: null, production_status: null, production_status_reason: null, phone_number_id: "100200300400500", blocked_reason: null, steps: [
    { key: "real_number", label: "Número real", done: false, detail: "" },
    { key: "number_registered", label: "Registro con PIN", done: false, detail: "" },
    { key: "templates", label: "Plantillas aprobadas", done: false, detail: "1 aprobada" },
    { key: "verify", label: "Revisar", done: false, detail: "" },
  ] };
  respuestas[`/admin/meta/connections/${M}/credentials`] = { fields: [
    { name: "app_id", label: "App ID", value: "1234567890", secret: false, configured: true },
    { name: "waba_id", label: "WABA ID", value: "998877", secret: false, configured: true },
    { name: "access_token", label: "Access token", value: null, secret: true, configured: true },
    { name: "verify_token", label: "Verify token", value: null, secret: true, configured: true },
  ] };
  respuestas[`/admin/meta/connections/${M}/business-numbers`] = { business_id: "55", business_name: "Café Aurora SAS", other_tenants_count: 0, warnings: [], numbers: [
    { waba_id: "998877", waba_name: "Café Aurora", is_connection_waba: true, phone_number_id: "100200300400500", display_phone_number: "+57 300 555 0101", verified_name: "Café Aurora", status: "CONNECTED", code_verification_status: "VERIFIED", platform_type: "CLOUD_API", quality_rating: "GREEN", name_status: "APPROVED", in_this_connection: true },
    { waba_id: "998877", waba_name: "Café Aurora", is_connection_waba: true, phone_number_id: "100200300400501", display_phone_number: "+57 300 555 0102", verified_name: "Café Aurora Soporte", status: "PENDING", code_verification_status: "NOT_VERIFIED", platform_type: "CLOUD_API", quality_rating: "UNKNOWN", name_status: "PENDING_REVIEW", in_this_connection: false },
  ] };
  respuestas["/admin/costs"] = { today: 0.4, month: 12.4, total_turns: 420, by_model: [], by_conversation: [], by_agent: [], meta: { by_category_country: [], discrepancy: [], service_allowance_hypothesis: false, by_phone: [
    { phone_number: "+57 300 555 0101", volume: 312, cost: 4.2 },
    { phone_number: "+57 300 555 0102", volume: 90, cost: 1.1 },
  ] } };
  respuestas["/admin/costs/meta/credits"] = { connections: [{ id: M, label: "Café Aurora", channel: "whatsapp", business_id: "55" }] };
  respuestas[`/admin/connections/${C1}/releases`] = [
    { id: "r8", number: 8, origin: "owner", manifest_hash: "abc", created_at: "2026-11-08T15:00:00Z", active: false, canary: false, last_event: null, last_event_at: null, lifecycle: null, detenida: false },
    { id: "r7", number: 7, origin: "owner", manifest_hash: "def", created_at: "2026-11-01T12:00:00Z", active: true, canary: false, last_event: "promoted", last_event_at: "2026-11-01T12:10:00Z", lifecycle: "promoted", detenida: false },
    { id: "r6", number: 6, origin: "platform", manifest_hash: "ghi", created_at: "2026-10-20T12:00:00Z", active: false, canary: false, last_event: "promoted", last_event_at: "2026-10-20T12:10:00Z", lifecycle: "promoted", detenida: false },
    { id: "r5", number: 5, origin: "owner", manifest_hash: "jkl", created_at: "2026-10-12T12:00:00Z", active: false, canary: false, last_event: "invalid", last_event_at: "2026-10-12T13:00:00Z", lifecycle: "invalid", detenida: true },
  ];
  respuestas[`/admin/connections/${C1}/canary`] = null;
  // La salud de la cuenta con chequeos de verdad: uno bien, uno por arreglar y uno sin dato.
  const salud = respuestas["/admin/meta/health"];
  respuestas["/admin/meta/health"] = {
    ...salud,
    connections: salud.connections.map((c) =>
      c.id === M
        ? { ...c, checks: [
            { key: "token_valid", ok: true, detail: null, repair_action: null },
            { key: "webhook_subscribed", ok: true, detail: null, repair_action: null },
            { key: "billing", ok: false, detail: "Falta el método de pago en WhatsApp Manager.", repair_action: "configure_billing" },
            { key: "templates", ok: null, detail: null, repair_action: "sync_templates" },
          ] }
        : c,
    ),
  };
  respuestas["/admin/meta/wizard"] = { meta_configured: true, app_id: "1234567890", config_id: "777", environments: ["sandbox", "production"], graph_api_version: "v21.0", missing_settings: [] };
  respuestas["/admin/meta/wizard/session"] = null;
  respuestas["/admin/meta/instagram"] = { meta_configured: true, app_id: "1234567890", config_id: "777", graph_api_version: "v21.0", missing_settings: [], plan_includes: true, login_available: true, login_missing: [] };
  respuestas["/admin/meta/instagram/accounts"] = { accounts: [{ ig_user_id: "17841400000000000", username: "cafeaurora", page_id: "1", page_name: "Café Aurora", eligible: true, reason: null, already_connected: true }] };
  respuestas["/admin/meta/messenger"] = { meta_configured: true, app_id: "1234567890", config_id: "777", graph_api_version: "v21.0", missing_settings: [], plan_includes: true };
  respuestas["/admin/meta/checklist/requirements"] = { meta_configured: true, steps: [
    { key: "app", label: "Crear la app de Meta", link: "https://developers.facebook.com/apps", done: true, notes: "" },
    { key: "revision", label: "Pedir la revisión de la app (App Review)", link: "https://developers.facebook.com/apps", done: false, notes: "Falta el permiso de mensajes" },
    { key: "negocio", label: "Verificar el negocio en Meta", link: "https://business.facebook.com/settings", done: false, notes: "" },
  ], checks: [
    { key: "webhook_verified", ok: true, detail: "El webhook responde la verificación de Meta" },
    { key: "templates_approved", ok: false, detail: "No hay plantillas aprobadas" },
    { key: "rls_tests_pass", ok: null, detail: "Se revisa en cada despliegue" },
  ] };
  respuestas[`/admin/meta/connections/${M}/numbers`] = { sync_error: null, numbers: [
    { id: "n1", phone_number_id: "100200300400500", display_phone_number: "+57 300 555 0101", verified_name: "Café Aurora", status: "CONNECTED", registered: true },
    { id: "n2", phone_number_id: "100200300400501", display_phone_number: "+57 300 555 0102", verified_name: "Café Aurora Soporte", status: "PENDING", registered: false },
  ] };
  respuestas[`/admin/meta/connections/${M}/templates`] = { sync_error: null, at_limit: false, templates: [
    { id: "t1", name: "confirmacion_pedido", language: "es_CO", category: "UTILITY", status: "APPROVED", quality_score: "GREEN", rejected_reason: null },
    { id: "t2", name: "recordatorio_cita", language: "es_CO", category: "UTILITY", status: "PENDING", quality_score: null, rejected_reason: null },
    { id: "t3", name: "promo_noviembre", language: "es", category: "MARKETING", status: "REJECTED", quality_score: null, rejected_reason: "INVALID_FORMAT" },
  ] };
  respuestas["/admin/connections/catalog"] = { categories: [
    { category: "comunicacion", label: "Comunicación", items: [
      { id: "whatsapp_meta", label: "WhatsApp", description: "Tu número con la API oficial de Meta.", available: true, setup_kind: "wizard", url: "/conexiones/whatsapp", has_schema: false },
      { id: "whatsapp_waweb", label: "WhatsApp (vincular por QR)", description: "Vincula un teléfono escaneando un código.", available: true, setup_kind: "wizard", url: "/conexiones/waweb", has_schema: false },
      { id: "instagram_meta", label: "Instagram", description: "Los mensajes directos de tu cuenta profesional.", available: true, setup_kind: "wizard", url: "/conexiones/instagram", has_schema: false },
      { id: "messenger_meta", label: "Messenger", description: "Los mensajes de tu Página de Facebook.", available: true, setup_kind: "wizard", url: "/conexiones/messenger", has_schema: false },
      { id: "webchat", label: "Chat web", description: "Un chat en tu sitio.", available: true, setup_kind: "wizard", url: "/conexiones/chat-web", has_schema: false },
      { id: "whatsapp_twilio", label: "WhatsApp", description: "Por Twilio, con tu propia cuenta.", available: false, setup_kind: "manual", url: null, has_schema: true },
    ] },
    { category: "correo", label: "Correo", items: [
      { id: "email_smtp", label: "Correo (SMTP)", description: "Envía correos desde tu dominio.", available: true, setup_kind: "manual", url: null, has_schema: true },
    ] },
    { category: "calendario", label: "Calendario", items: [
      { id: "google_calendar", label: "Google Calendar", description: "Agenda las citas en tu calendario.", available: true, setup_kind: "wizard", url: "/oauth", has_schema: false },
    ] },
  ] };
}

// AGENDAS=2: el negocio tiene dos agendas (HU-CAL-08) y el calendario trae una cita de cada una.
if (process.env.AGENDAS === "2") {
  respuestas["/pack/calendar/calendars"] = dosAgendas;
  // Una semana con trabajo: además de las tres de hoy, citas de lunes a sábado en las dos agendas.
  const semana = eventosAgenda();
  const [base, otra] = semana.events;
  const lunes = new Date();
  lunes.setUTCDate(lunes.getUTCDate() - ((lunes.getUTCDay() + 6) % 7));
  const a = (dia, h, min = 0) => new Date(Date.UTC(lunes.getUTCFullYear(), lunes.getUTCMonth(), lunes.getUTCDate() + dia, h + 5, min)).toISOString();
  const mas = [
    [0, 9, 0, 30, "Marta Díaz", base], [0, 11, 0, 20, "Jorge Peña", otra], [1, 14, 30, 30, "Sofía Rivas", base],
    [2, 9, 30, 20, "Camilo Vega", otra], [2, 16, 0, 30, "Valentina Ortiz", base], [3, 10, 0, 30, "Andrés Mora", base],
    [3, 10, 0, 20, "Lucía Herrera", otra], [4, 15, 0, 30, "Daniela Castro", base], [5, 9, 0, 20, "Felipe Rojas", otra],
  ].map(([dia, h, min, dur, nombre, molde], i) => ({ ...molde, id: `appt-s${i}`, title: nombre, start: a(dia, h, min), end: a(dia, h, min + dur) }));
  respuestas["/pack/calendar/events"] = { ...semana, events: [...semana.events, ...mas] };
  // El horario como lo guarda el backend: JSON día → «HH:MM-HH:MM» ("" = cerrado).
  respuestas["/admin/plugins/pack_calendar/config"] = { plugin_id: "pack_calendar", values: { business_hours: JSON.stringify({ mon: "08:00-18:00", tue: "08:00-18:00", wed: "08:00-18:00", thu: "08:00-18:00", fri: "08:00-17:00", sat: "09:00-13:00" }), multi_agenda_modo: "cliente_elige" } };
  // Un negocio que usa la Agenda la tiene habilitada: sin el aviso de pack bloqueado encima.
  respuestas["/admin/plugins"] = respuestas["/admin/plugins"].map((p) => (p.id === "pack_calendar" ? { ...p, enabled_for_tenant: true } : p));
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
  // Permisos por sección (lo del rol y un cambio propio en Conversaciones) e invitación pendiente.
  const delRol = { dashboard: "read", agents: "read", conversations: "read", escalations: "write", leads: "write", "pack_calendar:citas": "write", "pack_calendar:tipos": "read", "pack_calendar:bloqueos": "write", "pack_calendar:conexion": "none", "pack_subscriptions:suscripciones": "read" };
  const permisos = (propios) =>
    Object.keys(respuestas["/admin/me"].permissions ?? {}).map((section) =>
      section in propios ? { section, access: propios[section], heredado: false } : { section, access: delRol[section] ?? "none", heredado: true },
    );
  respuestas["/admin/collaborators/test-admin-2/permissions"] = permisos({ conversations: "write" });
  for (const id of ["g-1", "g-2", "g-3"]) respuestas[`/admin/collaborators/${id}/permissions`] = permisos({});
  respuestas["/admin/invitations/outgoing"] = [{ id: "inv-1", email: "carla@correo.co", rol: "colaborador", creadaEn: "2026-11-08T15:00:00Z" }];
}

// COMERCIO=1 (Ventas): una tienda de ropa con catálogo, variantes, categorías anidadas, promociones, pedidos en todos los
// estados y dos aliados (el módulo de aliados encendido).
// Pedidos y promociones con estado (COMERCIO=1): filtros, total y cambios que se ven al refrescar.
let pruebas = null;
// PRUEBAS=1 (Plataforma › Pruebas, SPEC-30): catálogo v24 con pruebas de panel, APK y WhatsApp, una ejecución propia en
// curso (con una falla, una nota y una captura), informes de tres testers, ciclo abierto y uno cerrado, evolución por
// versión, checklists de test y producción, datos de prueba del tester con escenarios y la gestión de testers. Con
// MASTER=1 se ve como admin de plataforma (pestaña Testers); con TESTER=1, como tester.
if (process.env.PRUEBAS === "1") {
  const hace = (h) => new Date(Date.now() - h * 3600_000).toISOString();
  const progreso = (ok, falla, bloqueada, omitida, en_curso, sin_correr) => ({
    total: ok + falla + bloqueada + omitida + en_curso + sin_correr, terminadas: ok + falla + bloqueada + omitida,
    ok, falla, bloqueada, omitida, en_curso, sin_correr,
  });
  const conteo = (xs) => ["ok", "falla", "bloqueada", "omitida", "en_curso", "sin_correr", "total"].reduce((a, k) => ({ ...a, [k]: xs.reduce((n, x) => n + x[k], 0) }), {});
  const subInf = (subseccion, ok, falla, bloqueada) => ({ subseccion, ok, falla, bloqueada, omitida: 0, en_curso: 0, sin_correr: 0, total: ok + falla + bloqueada });
  const areaInf = (area, subsecciones) => ({ area, subsecciones, ...conteo(subsecciones) });
  const seccionEvoInf = (entorno, areas) => ({ entorno, areas, ...conteo(areas) });
  const item = (slug, entorno, area, subseccion, titulo, extra = {}) => ({
    slug, seccion: "pruebas", orden: 0, modulo: area, grupo: area, area, subseccion, entorno, titulo,
    resumen: null, contexto: null, prioridad: "P1", plataforma: [entorno], precondiciones: ["Sesión iniciada como dueña del negocio de prueba"],
    datos: ["Tu negocio de prueba con Agenda y Ventas encendidas"], pasos: [
      { accion: "Abre la sección desde el menú", esperado: "Se ve la lista con los datos del negocio de prueba" },
      { accion: "Crea un registro nuevo con los datos de la guía", esperado: "Aparece arriba de la lista con su estado" },
      { accion: "Ábrelo y cambia un dato", esperado: "El cambio se guarda y se ve al volver a la lista" },
    ],
    esperado: null, porque: null, como: null, vars: [], quien: null, hu: ["HU-CAL-08"], origen: [], requiere: [],
    estado: "sin_correr", ejecuciones: { ok: 2, falla: 0 }, ...extra,
  });
  const items = [
    item("agenda-crear-cita", "panel", "Agenda", "Citas", "Crear una cita desde el calendario", { prioridad: "P0", hu: ["HU-CAL-02"] }),
    item("agenda-mover-cita", "panel", "Agenda", "Citas", "Mover una cita arrastrándola", { hu: ["HU-CAL-05"] }),
    item("agenda-varias-agendas", "panel", "Agenda", "Agendas", "Elegir entre dos agendas", { hu: ["HU-CAL-08"], ejecuciones: { ok: 0, falla: 1 } }),
    item("ventas-pedido-pago", "panel", "Ventas", "Pedidos", "Un pedido pasa a pagado con Wompi", { prioridad: "P0", datos: ["Tarjeta de prueba 4242 4242 4242 4242"], requiere: ["datos-wompi"], hu: ["HU-COM-04"], vars: ["WOMPI_PUBLIC_KEY"] }),
    item("ventas-vitrina", "panel", "Ventas", "Productos", "Ver los productos en vitrina", { hu: ["VEN-15"] }),
    item("cobranza-registrar-pago", "apk", "Cobranza", "Ruta", "Registrar un pago en la ruta del gestor", { prioridad: "P0", hu: ["HU-COB-11"] }),
    item("cobranza-promesa", "apk", "Cobranza", "Promesas", "Anotar una promesa de pago", { hu: ["HU-COB-14"] }),
    item("wa-tomar-pedido", "whatsapp", "Agentes", "Ventas", "El agente de Ventas toma un pedido por WhatsApp", { prioridad: "P0", datos: ["Tu teléfono con WhatsApp"], requiere: ["datos-whatsapp"], hu: ["HU-AOS-20"] }),
    item("wa-pasar-persona", "whatsapp", "Agentes", "Escalamiento", "Pedir hablar con una persona", { hu: ["HU-AOS-19"] }),
    item("wa-agendar", "whatsapp", "Agentes", "Agenda", "Agendar una cita conversando", { datos: ["Tu teléfono con WhatsApp"], requiere: ["datos-whatsapp"], hu: ["HU-CAL-06"] }),
    item("panel-paleta", "panel", "Panel", "Navegación", "Ir a cualquier sección con Ctrl+K", { hu: ["HU-DS-05"], pasos: [{ accion: "Pulsa Ctrl+K", esperado: "Se abre la paleta" }, { accion: "Escribe «prom»", esperado: "Aparece Promesas" }] }),
    item("panel-tema", "panel", "Panel", "Navegación", "Cambiar a tema claro y volver", { hu: ["SPEC-29"] }),
  ].map((it, i) => ({ ...it, orden: i + 1 }));
  const guia = [
    { slug: "datos-negocio", titulo: "Negocio y cuentas de prueba", resumen: "Se crean con «Preparar mis datos»." },
    { slug: "datos-wompi", titulo: "Tarjetas de prueba de Wompi", resumen: "4242 4242 4242 4242 aprueba; 4111 1111 1111 1111 rechaza." },
    { slug: "datos-whatsapp", titulo: "Número de WhatsApp de prueba", resumen: "Escríbele al número del negocio de prueba desde tu teléfono." },
  ].map((g, i) => ({ ...item(g.slug, "panel", "Datos", null, g.titulo), seccion: "datos", resumen: g.resumen, orden: i + 1, pasos: [], datos: [], hu: [] }));
  const punto = (slug, seccion, grupo, titulo, estado, extra = {}) => ({
    ...item(slug, "panel", grupo, null, titulo), seccion, grupo, estado, pasos: [], datos: [], hu: [], ...extra,
  });
  const test = [
    punto("test-wompi", "test", "Pagos", "Llaves de Wompi en sandbox", "listo", { porque: "Sin ellas los pedidos no pasan a pagado.", como: "Configura las llaves de sandbox en Coolify (test).", vars: ["WOMPI_PUBLIC_KEY", "WOMPI_PRIVATE_KEY"], quien: "Dueño de la plataforma", nota: "Cargadas el 8 de nov.", actualizado_en: hace(60) }),
    punto("test-meta", "test", "WhatsApp", "Número de Meta verificado", "en_curso", { porque: "Las pruebas de WhatsApp oficial necesitan el número verificado.", como: "Termina la verificación en el Business Manager.", quien: "Dueño de la plataforma", nota: "Falta el documento legal.", actualizado_en: hace(30) }),
    punto("test-correo", "test", "Correo", "Correo de acceso por Resend", "pendiente", { porque: "Las invitaciones llegan por correo.", como: "Crea la llave de Resend para test.", vars: ["RESEND_API_KEY"] }),
    punto("test-push", "test", "APK", "Notificaciones push", "no_aplica", { porque: "Solo si se prueba la APK en un teléfono.", como: "Instala la APK de test en un teléfono Android." }),
  ];
  const prod = [
    punto("prod-respaldo", "prod", "Base de datos", "Respaldo reciente de la base", "pendiente", { porque: "Antes del corte hay que poder volver atrás.", como: "Corre el respaldo y comprueba que se restaura.", quien: "Dueño de la plataforma" }),
    punto("prod-variables", "prod", "Variables", "Variables de producción revisadas", "en_curso", { porque: "Una variable de test en producción rompe pagos o correos.", como: "Compara contra el catálogo de variables.", vars: ["WOMPI_PUBLIC_KEY", "RESEND_API_KEY", "AGENT_CORE_API_URL"] }),
    punto("prod-dominio", "prod", "Dominio", "Dominio y certificados", "listo", { porque: "El panel y la API responden en el dominio propio.", como: "Revisa los certificados en Cloudflare.", actualizado_en: hace(200) }),
  ];
  const ciclo = { id: "ciclo-11", nombre: "Ciclo 2026-11 · rediseño del panel", abierto_en: hace(24 * 6) };
  const catalogoRef = { version: 24, fecha: "2026-11-04", commit_docs: "a1b2c3d" };
  const progresoCiclo = progreso(14, 3, 2, 1, 4, 12);
  const catalogos = {
    pruebas: { ciclo, catalogo: catalogoRef, progreso: progresoCiclo, items },
    datos: { ciclo, catalogo: catalogoRef, progreso: progreso(0, 0, 0, 0, 0, 0), items: guia },
    test: { ciclo, catalogo: catalogoRef, progreso: progreso(0, 0, 0, 0, 0, 0), items: test },
    prod: { ciclo, catalogo: catalogoRef, progreso: progreso(0, 0, 0, 0, 0, 0), items: prod },
  };
  const paso = (estado, nota = null) => ({ estado, nota });
  const ejecucion = (id, tester, estado, prog, resultados, extra = {}) => ({
    id, cycle_id: ciclo.id, ciclo_nombre: ciclo.nombre, tester, estado, editable: estado === "en_curso", comentario: null,
    iniciada_en: hace(24 * 5), actualizada_en: hace(2), enviada_en: estado === "enviada" ? hace(20) : null, progreso: prog, resultados, ...extra,
  });
  const mia = ejecucion("8f2b9a3c-1d4e-4f5a-9b6c-7d8e9f0a1b2c", { id: "t1", nombre: "Ana Prueba", email: "ana@prueba.example" }, "en_curso", progreso(3, 1, 0, 0, 1, 7), {
    "agenda-crear-cita": { estado: "ok", nota: null, pasos: { 1: paso("ok"), 2: paso("ok"), 3: paso("ok") }, adjuntos: [] },
    "agenda-mover-cita": { estado: "ok", nota: null, pasos: { 1: paso("ok"), 2: paso("ok"), 3: paso("ok") }, adjuntos: [] },
    "agenda-varias-agendas": { estado: "falla", nota: "Al elegir la segunda agenda se ven las citas de la primera.", pasos: { 1: paso("ok"), 2: paso("falla", "Salen las citas de «Consultorio 1»") }, adjuntos: [{ id: "adj-1", paso: 2, nombre: "agenda-equivocada.png", mimetype: "image/png", tamano: 182_000, subido_en: hace(3) }] },
    "ventas-pedido-pago": { estado: "en_curso", nota: null, pasos: { 1: paso("ok") }, adjuntos: [] },
    "ventas-vitrina": { estado: "ok", nota: null, pasos: { 1: paso("ok"), 2: paso("omitido"), 3: paso("ok") }, adjuntos: [] },
  });
  const bruno = { id: "t2", nombre: "Bruno Tester", email: "bruno@prueba.example" };
  const pasosDe = (it, estados, notas = {}) => it.pasos.map((x, i) => ({ n: i + 1, accion: x.accion, esperado: x.esperado, estado: estados[i] ?? null, nota: notas[i] ?? null, adjuntos: [] }));
  const enInforme = (slug, estado, estados, nota = null, notas = {}) => {
    const it = items.find((x) => x.slug === slug);
    return { slug, titulo: it.titulo, grupo: it.grupo, modulo: it.modulo, prioridad: it.prioridad, hu: it.hu, esperado: null, estado, nota, pasos: pasosDe(it, estados, notas) };
  };
  const informeBruno = {
    ciclo: { id: ciclo.id, nombre: ciclo.nombre }, catalogo: { version: catalogoRef.version, fecha: catalogoRef.fecha }, tester: bruno,
    iniciada_en: hace(24 * 5), enviada_en: hace(20), comentario: "La APK se cerró dos veces al registrar pagos sin señal.", progreso: progreso(9, 2, 1, 0, 0, 0),
    secciones: [
      seccionEvoInf("panel", [areaInf("Agenda", [subInf("Citas", 2, 0, 0), subInf("Agendas", 0, 1, 0)]), areaInf("Ventas", [subInf("Pedidos", 1, 0, 0), subInf("Productos", 1, 0, 0)]), areaInf("Panel", [subInf("Navegación", 2, 0, 0)])]),
      seccionEvoInf("apk", [areaInf("Cobranza", [subInf("Ruta", 0, 1, 0), subInf("Promesas", 0, 0, 1)])]),
      seccionEvoInf("whatsapp", [areaInf("Agentes", [subInf("Ventas", 1, 0, 0), subInf("Escalamiento", 1, 0, 0), subInf("Agenda", 1, 0, 0)])]),
    ],
    pruebas: [
      enInforme("agenda-crear-cita", "ok", ["ok", "ok", "ok"]),
      enInforme("agenda-varias-agendas", "falla", ["ok", "falla"], "Se ven las citas de la otra agenda.", { 1: "Salen las de «Consultorio 1»" }),
      enInforme("cobranza-registrar-pago", "falla", ["ok", "falla"], "La APK se cierra sin señal.", { 1: "Se cerró al guardar" }),
      enInforme("cobranza-promesa", "bloqueada", ["bloqueado"], "No hay clientes en mora en mi negocio de prueba."),
      enInforme("wa-tomar-pedido", "ok", ["ok", "ok", "ok"]),
    ],
    sin_correr: [],
  };
  const otra = ejecucion("2c1d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f", bruno, "enviada", progreso(9, 2, 1, 0, 0, 0), {}, { comentario: informeBruno.comentario, informe: informeBruno });
  const tercera = ejecucion("3d4e5f6a-7b8c-4d9e-8f0a-1b2c3d4e5f6a", { id: "t3", nombre: "", email: "carla@prueba.example" }, "en_curso", progreso(2, 0, 1, 1, 1, 7), {});
  const ejecuciones = [mia, otra, tercera];
  const cicloCerrado = {
    id: "ciclo-10", nombre: "Ciclo 2026-10 · SPEC-37", abierto_en: hace(24 * 30), cerrado_en: hace(24 * 8), abierto: false,
    catalogo: { version: 22, fecha: "2026-10-20", commit_docs: null }, progreso: progreso(31, 2, 1, 2, 0, 0),
    por_prueba: { "agenda-crear-cita": "ok", "wa-tomar-pedido": "falla", "cobranza-registrar-pago": "bloqueada" },
    ejecuciones: [{ run_id: otra.id, tester: "Bruno Tester", estado: "enviada", enviada_en: hace(24 * 9), progreso: progreso(18, 1, 0, 1, 0, 0) }],
  };
  const cicloAbierto = {
    ...ciclo, cerrado_en: null, abierto: true, catalogo: catalogoRef, progreso: progresoCiclo,
    por_prueba: { "agenda-crear-cita": "ok", "agenda-varias-agendas": "falla", "cobranza-registrar-pago": "bloqueada", "wa-tomar-pedido": "en_curso" },
    ejecuciones: ejecuciones.map((e) => ({ run_id: e.id, tester: e.tester.nombre || e.tester.email, estado: e.estado, enviada_en: e.enviada_en, progreso: e.progreso })),
  };
  const sub = (subseccion, ok, falla, bloqueada, sin_correr) => ({ subseccion, ok, falla, bloqueada, omitida: 0, en_curso: 0, sin_correr, total: ok + falla + bloqueada + sin_correr });
  const area = (nombre, subs) => ({ area: nombre, subsecciones: subs, ...["ok", "falla", "bloqueada", "omitida", "en_curso", "sin_correr", "total"].reduce((a, k) => ({ ...a, [k]: subs.reduce((n, x) => n + x[k], 0) }), {}) });
  const seccionEvo = (entorno, areas) => ({ entorno, areas, ...["ok", "falla", "bloqueada", "omitida", "en_curso", "sin_correr", "total"].reduce((a, k) => ({ ...a, [k]: areas.reduce((n, x) => n + x[k], 0) }), {}) });
  const evolucion = { versiones: [
    { version: 20, fecha: "2026-10-06", total_pruebas: 30, ciclo: { id: "ciclo-9", cerrado_en: hace(24 * 32) }, secciones: [seccionEvo("panel", [area("Agenda", [sub("Citas", 3, 1, 0, 0)]), area("Ventas", [sub("Pedidos", 2, 0, 0, 1)])]), seccionEvo("whatsapp", [area("Agentes", [sub("Ventas", 1, 1, 0, 0)])])] },
    { version: 22, fecha: "2026-10-20", total_pruebas: 36, ciclo: { id: "ciclo-10", cerrado_en: hace(24 * 8) }, secciones: [seccionEvo("panel", [area("Agenda", [sub("Citas", 4, 0, 0, 0), sub("Agendas", 1, 0, 0, 0)]), area("Ventas", [sub("Pedidos", 3, 0, 0, 0)])]), seccionEvo("apk", [area("Cobranza", [sub("Ruta", 1, 0, 1, 0)])]), seccionEvo("whatsapp", [area("Agentes", [sub("Ventas", 1, 1, 0, 0)])])] },
    { version: 24, fecha: "2026-11-04", total_pruebas: 36, ciclo: { id: ciclo.id, cerrado_en: null }, secciones: [seccionEvo("panel", [area("Agenda", [sub("Citas", 2, 0, 0, 0), sub("Agendas", 0, 1, 0, 0)]), area("Ventas", [sub("Pedidos", 0, 0, 0, 1), sub("Productos", 1, 0, 0, 0)])]), seccionEvo("apk", [area("Cobranza", [sub("Ruta", 0, 0, 1, 0)])]), seccionEvo("whatsapp", [area("Agentes", [sub("Ventas", 0, 0, 0, 1)])])] },
  ] };
  const misDatos = {
    disponible: true,
    datos: {
      estado: "listo", error: null, creado_en: hace(24 * 4), actualizado_en: hace(24 * 4),
      negocio: { id: "neg-qa-ana", slug: "qa-ana", nombre: "Moto Repuestos (prueba de Ana)" },
      cuentas: [
        { rol: "dueno", titulo: "Dueña", uso: "Para probar todo el panel y configurar.", email: "qa-ana+dueno@prueba.example", creada: true },
        { rol: "gestor", titulo: "Gestor de cobranza", uso: "Para la ruta y los pagos en la APK.", email: "qa-ana+gestor@prueba.example", creada: true },
        { rol: "colaborador", titulo: "Colaborador", uso: "Para probar permisos limitados.", email: "qa-ana+colab@prueba.example", creada: false },
      ],
      contenido: [{ habilidad: "pack_calendar", detalle: ["2 agendas", "5 tipos de cita", "12 citas esta semana"] }, { habilidad: "pack_commerce", detalle: ["24 productos", "6 pedidos"] }],
      agent_os: { estado: "listo", motivo: null, chat_web: { clave: "qa-ana-chat", enlace: "https://chat.prueba.example/qa-ana", activo: true }, agentes: [{ key: "general", nombre: "General", rol: "Coordina", por_defecto: true }, { key: "ventas", nombre: "Ventas", rol: "Especialista", por_defecto: false }] },
      contrasenas: {},
    },
    contenido: [],
  };
  const escenarios = { datos_listos: true, escenarios: [
    { slug: "agenda-semana-llena", titulo: "Una semana llena en la agenda", crea: "20 citas repartidas en dos agendas, con 3 por confirmar.", requiere: "Agenda encendida", donde: "Agenda", ruta: "/calendario", agent_os: false, ultimo: { sufijo: "a7", detalle: ["20 citas", "3 por confirmar"], ruta: "/calendario", creado_en: hace(30) } },
    { slug: "ventas-pedidos-por-pagar", titulo: "Pedidos esperando pago", crea: "5 pedidos con el link de pago de Wompi sin pagar.", requiere: "Ventas encendida y llaves de Wompi", donde: "Ventas › Pedidos", ruta: "/comercio/pedidos", agent_os: false, ultimo: null },
    { slug: "cobranza-mora", titulo: "Clientes en mora", crea: "8 clientes con cuotas atrasadas y 2 promesas vencidas.", requiere: "Cobranza encendida", donde: "Cobranza", ruta: "/cobranza", agent_os: false, ultimo: null },
    { slug: "agente-conversaciones", titulo: "Conversaciones con el agente", crea: "10 conversaciones de clientes con Ventas, una pasada a una persona.", requiere: "Agent OS listo", donde: "Conversaciones", ruta: "/conversaciones", agent_os: true, ultimo: null },
  ] };
  const testers = { habilitado: true, testers: [
    { id: "t1", email: "ana@prueba.example", estado: "activo", creado_en: hace(24 * 20), invitado_en: hace(24 * 20), expira_en: null, aceptado_en: hace(24 * 19) },
    { id: "t2", email: "bruno@prueba.example", estado: "activo", creado_en: hace(24 * 15), invitado_en: hace(24 * 15), expira_en: null, aceptado_en: hace(24 * 15) },
    { id: "t3", email: "carla@prueba.example", estado: "invitado", creado_en: hace(30), invitado_en: hace(30), expira_en: hace(-24 * 6), aceptado_en: null },
    { id: "t4", email: "diego@prueba.example", estado: "vencido", creado_en: hace(24 * 12), invitado_en: hace(24 * 12), expira_en: hace(24 * 5), aceptado_en: null },
  ] };
  respuestas["/admin/qa/runs/me"] = mia;
  respuestas["/admin/qa/runs"] = ejecuciones;
  for (const e of ejecuciones) respuestas[`/admin/qa/runs/${e.id}`] = e;
  respuestas["/admin/qa/cycles"] = [cicloAbierto, cicloCerrado];
  respuestas["/admin/qa/evolution"] = evolucion;
  respuestas["/admin/qa/datos"] = misDatos;
  respuestas["/admin/qa/datos/escenarios"] = escenarios;
  respuestas["/admin/qa/testers"] = testers;
  pruebas = (metodo, ruta, url) => {
    if (metodo === "GET" && ruta === "/admin/qa/catalog") return [200, catalogos[url.searchParams.get("seccion") ?? "pruebas"] ?? catalogos.pruebas];
    if (metodo === "GET" && /^\/admin\/qa\/items\/[^/]+\/history$/.test(ruta)) return [200, [{ campo: "estado", paso: 2, antes: "ok", despues: "falla", por: "Ana Prueba", en: hace(3), run_id: null }, { campo: "nota", paso: 2, antes: null, despues: "Salen las citas de «Consultorio 1»", por: "Ana Prueba", en: hace(3), run_id: null }]];
    return null;
  };
}
let comercio = null;
if (process.env.COMERCIO === "1") {
  const C = "/pack/commerce";
  const cat = (id, name, parent_id = null, sort_order = 0) => ({ id, name, parent_id, sort_order, active: true });
  const categorias = [cat("cat-ropa", "Ropa", null, 1), cat("cat-camisetas", "Camisetas", "cat-ropa", 1), cat("cat-pantalones", "Pantalones", "cat-ropa", 2), cat("cat-acc", "Accesorios", null, 2), { ...cat("cat-temporada", "Temporada pasada", null, 3), active: false }];
  const variante = (id, sku, attributes, price, stock, active = true) => ({ id, sku, attributes, price, stock, active });
  const producto = (id, name, category_id, price, variants, extra = {}) => ({
    id, name, description: "", category_id, category: categorias.find((c) => c.id === category_id)?.name ?? "", ally_id: null, price, image_url: null, image_url_externa: null, image_key: null, variants, ...extra,
  });
  const ALIADO_A = "8f2b1c3a-1d2e-4f50-9a6b-1c2d3e4f5a6b";
  const ALIADO_B = "9a3c2d4b-2e3f-4a61-8b7c-2d3e4f5a6b7c";
  const productos = [
    producto("p-1", "Camiseta básica", "cat-camisetas", 39000, [variante("v-1", "CAM-BAS-S-NEG", { talla: "S", color: "Negro" }, 39000, 12), variante("v-2", "CAM-BAS-M-NEG", { talla: "M", color: "Negro" }, 39000, 3), variante("v-3", "CAM-BAS-L-BLA", { talla: "L", color: "Blanco" }, 39000, 0)], { description: "Algodón peinado, corte recto." }),
    producto("p-2", "Jean clásico", "cat-pantalones", 129000, [variante("v-4", "JEA-CLA-30", { talla: "30" }, 129000, 7), variante("v-5", "JEA-CLA-32", { talla: "32" }, 129000, 5)]),
    producto("p-3", "Gorra bordada", "cat-acc", 45000, [variante("v-6", "GOR-BOR-UNI", { talla: "Única" }, 45000, 20)], { ally_id: ALIADO_A }),
    producto("p-4", "Medias pack x3", "cat-acc", 25000, [variante("v-7", "MED-X3", {}, 25000, 0)], { ally_id: ALIADO_B }),
    producto("p-5", "Camiseta oversize", "cat-camisetas", 59000, [variante("v-8", "CAM-OVR-M", { talla: "M" }, 59000, 9), variante("v-9", "CAM-OVR-L", { talla: "L" }, 62000, 4, false)]),
  ];
  const linea = (name, quantity, unit_price) => ({ name, quantity, unit_price });
  const pedido = (n, nombre, status, payment_status, total, horas, lineas, extra = {}) => ({
    id: `o-${n}`, public_order_number: `PED-10${n}`, customer_id: `cli-${n}`, customer_name: nombre, total, status, payment_status, payment_method: "pago_en_linea", delivery_method: "domicilio",
    delivery_full_name: nombre, delivery_address: "Cra 7 # 45-10, Bogotá", created_at: new Date(Date.now() - horas * 3600_000).toISOString(), line_items: lineas, ...extra,
  });
  const pedidos = [
    pedido(1, "Ana Prueba", "abierto", "pendiente", 207000, 2, [linea("Jean clásico 30", 1, 129000), linea("Camiseta básica S Negro", 2, 39000)]),
    pedido(2, "Camilo Vega", "abierto", "pagado", 59000, 5, [linea("Camiseta oversize M", 1, 59000)]),
    pedido(3, "Laura Gómez", "despachado", "pagado", 90000, 28, [linea("Gorra bordada", 2, 45000)]),
    pedido(4, "Pedro Ruiz", "entregado", "pagado", 129000, 72, [linea("Jean clásico 32", 1, 129000)], { delivery_method: "recoger_en_tienda", payment_method: "efectivo_contraentrega" }),
    pedido(5, "Marta Díaz", "cancelado", "rechazado", 25000, 96, [linea("Medias pack x3", 1, 25000)]),
    pedido(6, null, "expirado", "pendiente", 39000, 150, [linea("Camiseta básica M Negro", 1, 39000)], { customer_name: null, delivery_full_name: null }),
  ];
  respuestas[`${C}/categories`] = categorias;
  respuestas[`${C}/products`] = productos;
  respuestas[`${C}/modulos`] = { aliados: true };
  respuestas[`${C}/allies`] = [
    { id: ALIADO_A, name: "Taller Bordados Ruiz", contact_info: { contacto: "Jorge Ruiz", telefono: "+57 310 555 0101", email: "jorge@bordados.co" }, active: true, products: 1, created_at: "2026-09-01T10:00:00Z" },
    { id: ALIADO_B, name: "Medias del Norte", contact_info: { telefono: "+57 300 555 0202" }, active: false, products: 1, created_at: "2026-08-15T10:00:00Z" },
  ];
  respuestas[`${C}/promotions`] = [
    { id: "pr-1", type: "temporada", rules: { label: "Día sin IVA", discount_pct: 19 }, active: true, valid_from: "2026-11-20T00:00:00Z", valid_to: "2026-11-21T23:59:00Z", category_id: "cat-ropa", product_id: null, include_child_categories: true, eligible_segments: null },
    { id: "pr-2", type: "volumen", rules: { label: "Lleva más, paga menos", tiers: [{ min: 3, max: 5, discount_pct: 10 }, { min: 6, discount_pct: 15 }] }, active: true, valid_from: null, valid_to: null, category_id: null, product_id: "p-1", include_child_categories: false, eligible_segments: null },
    { id: "pr-3", type: "campaña", rules: { label: "Bienvenida", discount_pct: 10, once_per_customer: true }, active: false, valid_from: null, valid_to: null, category_id: null, product_id: null, include_child_categories: false, eligible_segments: ["nuevo"] },
  ];
  respuestas[`${C}/orders`] = pedidos;
  comercio = (metodo, ruta, url, cuerpo) => {
    if (metodo === "GET" && ruta === `${C}/orders`) {
      const q = (url.searchParams.get("q") ?? "").toLowerCase();
      const filtrados = pedidos.filter(
        (o) =>
          (!url.searchParams.get("estado") || o.status === url.searchParams.get("estado")) &&
          (!url.searchParams.get("pago") || o.payment_status === url.searchParams.get("pago")) &&
          (!url.searchParams.get("customer_id") || o.customer_id === url.searchParams.get("customer_id")) &&
          (!q || o.public_order_number.toLowerCase().includes(q) || (o.customer_name ?? "").toLowerCase().includes(q)),
      );
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const limit = Number(url.searchParams.get("limit") ?? 200);
      return [200, filtrados.slice(offset, offset + limit), { "X-Total-Count": String(filtrados.length) }];
    }
    const estado = ruta.match(new RegExp(`^${C}/orders/([^/]+)/status$`));
    if (metodo === "POST" && estado) {
      const pedido = pedidos.find((o) => o.id === decodeURIComponent(estado[1]));
      if (pedido && cuerpo.status) pedido.status = cuerpo.status;
      return [pedido ? 204 : 404, null];
    }
    const alternar = ruta.match(new RegExp(`^${C}/promotions/([^/]+)/toggle$`));
    if (metodo === "POST" && alternar) {
      const promo = respuestas[`${C}/promotions`].find((x) => x.id === decodeURIComponent(alternar[1]));
      if (promo) promo.active = !promo.active;
      return [promo ? 204 : 404, null];
    }
    return null;
  };
  respuestas[`${C}/dashboard`] = {
    kpi: { leads: 42, products: productos.length, promotions: 2, orders: pedidos.length },
    recent_orders: pedidos.slice(0, 5).map((o) => ({ id: o.id, public_order_number: o.public_order_number, total: o.total, status: o.status, created_at: o.created_at })),
  };
  respuestas["/admin/me"] = { ...respuestas["/admin/me"], permissions: { ...(respuestas["/admin/me"].permissions ?? {}), pack_commerce: "write" } };
  respuestas["/admin/datos-de-prueba/ventas"] = { modulo: "ventas", titulo: "Ventas", disponible: false, motivo: "Tu negocio ya tiene productos.", falta_descripcion: false, lote: null };
}

// Mensajes fallidos (/dlq): dos mensajes que agotaron sus reintentos y un evento de pago sin entregar.
respuestas["/admin/dlq"] = {
  entries: [
    { entry_id: "1731200000000-0", external_message_id: "wamid.HBgMNTczMDAwMDAwMDAxFQIAEhgUM0E", tenant_id: "test-tenant-1", content: "Hola, quiero agendar una cita para mañana" },
    { entry_id: "1731200005000-0", external_message_id: "wamid.HBgMNTczMDAwMDAwMDAyFQIAEhgUM0F", tenant_id: "test-tenant-1", content: "¿Me mandas el link de pago?" },
  ],
};
respuestas["/admin/domain-events"] = {
  entries: [{ id: "ev-1", topic: "payment.approved", attempts: 5, last_error: "TimeoutError: el webhook de Wompi no respondió en 10 s", created_at: "2026-11-09T14:00:00Z" }],
};

// Configuración de Comercio (/habilidades/pack_commerce): un formulario con texto, número, interruptor y una llave.
respuestas["/admin/plugins/pack_commerce/config"] = {
  plugin_id: "pack_commerce",
  name: "pack_commerce",
  description: "Catálogo, pedidos y pagos por WhatsApp.",
  schema: {
    type: "object",
    properties: {
      moneda: { type: "string", title: "Moneda", default: "COP" },
      pedido_minimo: { type: "integer", title: "Pedido mínimo", description: "En pesos. 0 = sin mínimo." },
      envio_gratis: { type: "boolean", title: "Envío gratis", description: "No cobrar domicilio." },
      wompi_public_key: { type: "string", title: "wompi_public_key" },
      wompi_private_key: { type: "string", title: "wompi_private_key", format: "password", "x-secret": true },
    },
    required: ["moneda"],
  },
  values: { moneda: "COP", pedido_minimo: 20000, envio_gratis: false, wompi_public_key: "pub_test_abc" },
  configured_secrets: ["wompi_private_key"],
};

// CONSUMO=1 (Consumo y plan): plan Pro con el crédito al 84 %, un período por pagar, pagos de varios canales, tres
// planes y costos del mes por agente, modelo y conversación, con datos de Meta y una diferencia por revisar.
if (process.env.CONSUMO === "1") {
  const hoy = new Date();
  const dia = (n) => new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + n, 12).toISOString();
  respuestas["/admin/plan"] = {
    overview: { plan_id: "pro", plan_name: "Pro", status: "active", operational: true, days_left: 9, has_plan: true },
    usage: [
      { key: "agentes", label: "Agentes publicados", unit: "agentes", scope: "lifetime", used: 3, limit: 3, percent: 100, exceeded: false },
      { key: "colaboradores", label: "Colaboradores", unit: "colaboradores", scope: "lifetime", used: 4, limit: 10, percent: 40, exceeded: false },
      { key: "conversaciones", label: "Conversaciones", unit: "conv", scope: "month", used: 812, limit: 1500, percent: 54.1, exceeded: false },
      { key: "conversaciones_audio", label: "Audios", unit: "audios", scope: "month", used: 96, limit: 100, percent: 96, exceeded: false },
      { key: "clientes", label: "Clientes", unit: "clientes", scope: "lifetime", used: 1240, limit: null, percent: null, exceeded: false },
    ],
    payments: [
      { plan_id: "pro", amount_cop: 249000, status: "pending", provider: "wompi", created_at: dia(-1), paid_at: null, checkout_url: "https://checkout.wompi.co/l/prueba123", periodo: "2026-11" },
      { plan_id: "pro", amount_cop: 249000, status: "approved", provider: "asistente", created_at: dia(-31), paid_at: dia(-31), checkout_url: null, periodo: "2026-10" },
      { plan_id: "basic", amount_cop: 99000, status: "approved", provider: "wompi", created_at: dia(-62), paid_at: dia(-62), checkout_url: null, periodo: "2026-09" },
      { plan_id: "basic", amount_cop: 99000, status: "declined", provider: "plataforma", created_at: dia(-63), paid_at: null, checkout_url: null, periodo: "2026-09" },
    ],
    plans: [
      { id: "free", name: "Gratis", price_cop: 0, is_free: true, current: false, limits: { agentes: 1, colaboradores: 2, conversaciones: 100 }, features: {}, monthly_credits: 2500 },
      { id: "basic", name: "Básico", price_cop: 99000, is_free: false, current: false, limits: { agentes: 2, colaboradores: 5, conversaciones: 500 }, features: { soporte: "Soporte por WhatsApp" }, monthly_credits: 20000 },
      { id: "pro", name: "Pro", price_cop: 249000, is_free: false, current: true, limits: { agentes: 3, colaboradores: 10, conversaciones: 1500, conversaciones_audio: 100 }, features: { soporte: "Soporte prioritario", reportes: true }, monthly_credits: 60000 },
      { id: "empresa", name: "Empresa", price_cop: 590000, is_free: false, current: false, limits: { agentes: 8, colaboradores: null, conversaciones: null }, features: { soporte: "Soporte prioritario", reportes: true, multi_negocio: true }, monthly_credits: 150000 },
    ],
    cobro: { referencia: "PLAN-PRO-2026-11", inicio: dia(-21), fin: dia(9), plan_id: "pro", monto_cop: 249000, estado: "pendiente", pagado_por: null, disponible_desde: null },
    credit: {
      limit: 60000,
      used: 50412.5,
      percent: 84.0,
      period_start: dia(-21),
      period_end: dia(9),
      by_concept: { llm_turn: 41200, stt: 3912.5, vision: 1800, template_sent: 3500 },
      by_agent: [
        { agent_id: "00000000-0000-4000-8000-0000000000a1", name: "Ventas", used: 28900 },
        { agent_id: "00000000-0000-4000-8000-0000000000a2", name: "Cobranza", used: 15200 },
        { agent_id: "00000000-0000-4000-8000-0000000000a3", name: "Agenda", used: 4800 },
        { agent_id: null, name: null, used: 1512.5 },
      ],
      by_agent_truncated: false,
    },
    plan_por_el_asistente: false,
  };
  respuestas["/admin/costs"] = {
    today: 0.62,
    month: 18.45,
    total_turns: 4120,
    by_agent: [
      { agent_id: "00000000-0000-4000-8000-0000000000a1", agent_name: "Ventas", turns: 2410, tokens_in: 8_120_000, cached_tokens: 5_030_000, cached_pct: 61.9, cost: 10.82 },
      { agent_id: "00000000-0000-4000-8000-0000000000a2", agent_name: "Cobranza", turns: 1290, tokens_in: 4_300_000, cached_tokens: 1_720_000, cached_pct: 40, cost: 5.71 },
      { agent_id: "00000000-0000-4000-8000-0000000000a3", agent_name: "Agenda", turns: 380, tokens_in: 910_000, cached_tokens: 0, cached_pct: null, cost: 1.52 },
      { agent_id: null, agent_name: null, turns: 40, tokens_in: 120_000, cached_tokens: 0, cached_pct: null, cost: 0.4 },
    ],
    by_model: [
      { model: "anthropic/claude-haiku-5-5", calls: 3610, tokens_in: 11_900_000, tokens_out: 820_000, avg_latency: 1840, cost: 14.9 },
      { model: "openai/whisper-1", calls: 96, tokens_in: 0, tokens_out: 0, avg_latency: 2300, cost: 1.2 },
      { model: "google/gemini-2.5-flash", calls: 410, tokens_in: 1_430_000, tokens_out: 110_000, avg_latency: 950, cost: 2.35 },
    ],
    by_conversation: [
      { conversation_id: "3f2a9c1e-7b4d-4e21-9a0f-1c2d3e4f5a6b", turns: 64, cost: 0.92, last: dia(0) },
      { conversation_id: "8b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e", turns: 41, cost: 0.58, last: dia(-1) },
      { conversation_id: "c9d8e7f6-a5b4-4c3d-9e2f-1a0b9c8d7e6f", turns: 33, cost: 0.44, last: dia(-3) },
    ],
    meta: {
      service_allowance_hypothesis: true,
      by_category_country: [
        { category: "marketing", country: "CO", volume: 420, cost: 9.8 },
        { category: "utility", country: "CO", volume: 1310, cost: 4.6 },
        { category: "service", country: "CO", volume: 2890, cost: 0 },
        { category: "authentication", country: "CO", volume: 54, cost: 0.4 },
      ],
      by_phone: [
        { phone_number: "+57 300 555 0101", volume: 4210, cost: 13.1 },
        { phone_number: "+57 300 555 0102", volume: 464, cost: 1.7 },
      ],
      discrepancy: [
        { category: "marketing", webhook_count: 420, pricing_volume: 420, diff: 0 },
        { category: "utility", webhook_count: 1290, pricing_volume: 1310, diff: -20 },
        { category: "service", webhook_count: 2890, pricing_volume: 2890, diff: 0 },
      ],
    },
  };
  respuestas["/admin/costs/meta/credits"] = { connections: [{ id: "c-meta-1", label: "WhatsApp Café Aurora", channel: "whatsapp", business_id: "55" }] };
}

// SEGURIDAD: dispositivos y alertas de acceso del negocio (HU-ACC-04), con una política por rol. Fechas relativas a
// ahora; `/access/devices?estado=` y `/access/events?severidad=` filtran (handler `seguridad`).
let seguridad = null;
{
  const hace = (h) => new Date(Date.now() - h * 3600_000).toISOString();
  const cuenta = (id, email, nombre, rol = "colaborador") => ({ id, email, nombre, rol: id === "test-admin-1" ? "owner" : rol });
  const equipo = (id, c, estado, extra = {}) => ({ id, cuenta: c, device_id_corto: "a1b2c3", device_label: "Samsung A15", plataforma: "android", estado, origen: "autoregistro", rol_al_registrar: "gestor", bloqueo_equipo: false, legacy: false, ultimo_uso_at: hace(3), ultima_ip: "190.25.1.10", aprobado_at: null, bloqueado_at: null, motivo: null, created_at: hace(2), ...extra });
  const gestor1 = cuenta("g-1", "gestor@test.example", "Gestor Uno");
  const desconocido = cuenta("g-3", "desconocido@test.example", null);
  respuestas["/access/policy"] = { owner: "abierto", colaborador: "abierto", gestor: "restringido" };
  const equipos = [
    equipo("d1", gestor1, "pendiente", { ultimo_uso_at: null }),
    equipo("d4", cuenta("g-4", "marta@test.example", "Marta Gestora"), "pendiente", { device_label: "iPhone 13", plataforma: "ios", device_id_corto: "77aa01", ultimo_uso_at: null, created_at: hace(26) }),
    equipo("d2", cuenta("test-admin-1", "duena@test.example", "Dueña"), "activo", { rol_al_registrar: "owner", origen: "politica_abierta", device_label: "Pixel 8", device_id_corto: "9f8e7d", ultimo_uso_at: hace(0.2) }),
    equipo("d5", cuenta("g-5", "pedro@test.example", "Pedro Gestor"), "activo", { device_label: "Moto G54", device_id_corto: "5c5c12", ultimo_uso_at: hace(3), aprobado_at: hace(400) }),
    equipo("d6", cuenta("c-6", "ana@test.example", "Ana Colaboradora"), "activo", { rol_al_registrar: "colaborador", device_label: "iPhone 12", plataforma: "ios", device_id_corto: "12ab34", ultimo_uso_at: hace(22) }),
    equipo("d3", desconocido, "bloqueado", { bloqueado_at: hace(300), motivo: "Equipo perdido", ultimo_uso_at: hace(1) }),
  ];
  const eventos = [
    { id: "e3", tipo: "dispositivo_bloqueado_usado", severidad: "critico", canal: "campo", rol: "gestor", cuenta: desconocido, device_id_corto: "a1b2c3", ip: "190.25.1.11", detalle: null, occurred_at: hace(1) },
    { id: "e1", tipo: "dispositivo_pendiente", severidad: "aviso", canal: "campo", rol: "gestor", cuenta: gestor1, device_id_corto: "a1b2c3", ip: "190.25.1.10", detalle: null, occurred_at: hace(2) },
    { id: "e2", tipo: "login_fallido", severidad: "aviso", canal: "panel_apk", rol: null, cuenta: null, device_id_corto: null, ip: "181.1.1.1", detalle: { repeticiones_previas: 2 }, occurred_at: hace(3) },
    { id: "e4", tipo: "dispositivo_pendiente", severidad: "aviso", canal: "campo", rol: "gestor", cuenta: cuenta("g-4", "marta@test.example", "Marta Gestora"), device_id_corto: "77aa01", ip: "190.25.1.12", detalle: null, occurred_at: hace(26) },
    { id: "e5", tipo: "politica_cambiada", severidad: "info", canal: "panel_apk", rol: "owner", cuenta: cuenta("test-admin-1", "duena@test.example", "Dueña"), device_id_corto: null, ip: null, detalle: null, occurred_at: hace(30) },
    { id: "e6", tipo: "dispositivo_nuevo", severidad: "info", canal: "panel_apk", rol: "colaborador", cuenta: cuenta("c-6", "ana@test.example", "Ana Colaboradora"), device_id_corto: "12ab34", ip: "190.25.1.13", detalle: null, occurred_at: hace(80) },
  ];
  seguridad = (ruta, url) => {
    if (ruta === "/access/devices") {
      const estado = url.searchParams.get("estado");
      return { items: equipos.filter((d) => !estado || d.estado === estado), next_cursor: null };
    }
    if (ruta === "/access/events") {
      const severidad = url.searchParams.get("severidad");
      return { items: eventos.filter((e) => !severidad || e.severidad === severidad), next_cursor: null };
    }
    return null;
  };
}

// BIENVENIDA=1: el asistente de primer uso a medio camino (con AGENTES=1 trae las plantillas de agente).
if (process.env.BIENVENIDA === "1") {
  const pp = respuestas["/admin/onboarding"];
  respuestas["/admin/onboarding"] = { ...pp, recorrido: { ...pp.recorrido, estado: "en_curso", paso: 1, total_pasos: 6, aplica: true, abrir: true, avisar: true } };
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
// FICHA_AGENTE=1 (HU-UX-09): la ficha de Ventas con sus conexiones (rol, prioridad y principal), indicadores de
// 7 días, superpoderes de dos habilidades y el chat de prueba por su conexión principal.
if (process.env.FICHA_AGENTE === "1" || process.env.AGENTES === "1") {
  const GENERAL_ID = "00000000-0000-4000-8000-000000000001";
  const instancia = (agentId, key, name, extra) => ({
    instance_id: `${key}-${extra.conexion}`, agent_id: agentId, key, name, role: "specialist", is_default: false, enabled: true,
    priority: 100, release_version: 3, latest_version: 3, ...extra,
  });
  const base = RESPUESTAS["/admin/connections/console"];
  const conexion = (id, label, type_id, channel, agents, extra = {}) => ({
    ...base.items[0], id, label, type_id, channel, external_id: id, meta_connection_id: null, is_primary: false, agents, ...extra,
  });
  respuestas["/admin/connections/console"] = {
    ...base,
    items: [
      conexion("00000000-0000-4000-8000-0000000000c1", "Chat de la tienda", "webchat", "web", [
        instancia(VENTAS_ID, "ventas", "Ventas", { conexion: "c1", is_default: true, priority: 10 }),
        instancia(GENERAL_ID, "general", "General", { conexion: "c1", priority: 100 }),
      ]),
      conexion("00000000-0000-4000-8000-0000000000c2", "WhatsApp ventas", "whatsapp_meta", "whatsapp", [
        instancia(VENTAS_ID, "ventas", "Ventas", { conexion: "c2", priority: 50 }),
      ], { health: "degraded", is_primary: true }),
      conexion("00000000-0000-4000-8000-0000000000c3", "WhatsApp Web bodega", "whatsapp_waweb", "whatsapp", [
        instancia(VENTAS_ID, "ventas", "Ventas", { conexion: "c3", priority: 200, enabled: false, release_version: null }),
      ]),
    ],
  };
  respuestas[`/admin/agents/${VENTAS_ID}`] = {
    id: VENTAS_ID, key: "ventas", kind: "specialist", contract: "agentspec/3", name: "Ventas",
    description: "Toma pedidos, resuelve dudas de productos y agenda entregas.",
    status: "active", latest_version: 3, created_at: "2026-10-20T12:00:00Z",
    draft: {
      lock_version: 1, base_version_id: null, updated_at: "2026-11-05T12:00:00Z",
      content: {
        contract: "agentspec/3", description: "Ventas",
        persona: { inheritConnectionVoice: true, maxLength: 500, forbiddenPhrases: [] },
        model: { primary: "deepseek-flash", temperature: 0.3 },
        procedures: [{ id: "pack_commerce.tomar_pedido", version: "^1.0", overrides: { examples: ["me separas dos cajas"] } }],
        memory: { shortTermTurns: 30, readScopes: ["customer", "connection", "tenant"], writeNamespaces: [] },
      },
    },
    versions: [{ id: "v3", version: 3, label: "", contract: "agentspec/3", content_hash: "x", notes: "", legacy: false, created_at: "2026-11-04T12:00:00Z" }],
  };
  const pagina = (items) => ({ items, total: items.length, page: 1, page_size: 100, has_more: false });
  respuestas["/admin/agent-superpowers"] = pagina([
    { id: "pack_commerce.tomar_pedido", version: "1.2.0", skill: "pack_commerce", title: "Tomar un pedido", description: "Arma el pedido con el cliente y lo confirma.", phrases: ["quiero comprar", "hacer un pedido", "me lo vendes"] },
    { id: "pack_commerce.consultar_catalogo", version: "1.0.0", skill: "pack_commerce", title: "Consultar el catálogo", description: "Busca productos, precios y existencias.", phrases: ["qué tienen", "cuánto vale", "hay en talla M"] },
    { id: "pack_calendar.agendar_cita", version: "2.1.0", skill: "pack_calendar", title: "Agendar una entrega", description: "Busca un espacio libre en la agenda.", phrases: ["cuándo me llega", "agéndame la entrega", "tienen turno mañana"] },
  ]);
  respuestas["/admin/agent-models"] ??= { items: [], total: 0, page: 1, page_size: 100, has_more: false, provider: "deepseek", byok_model: null, avg_input_tokens: null, avg_output_tokens: null, sample_turns: 0, min_phrases: 3 };
  respuestas[`/admin/agents/${VENTAS_ID}/requirements`] = pagina([]);
  respuestas["/admin/reliability"] = {
    period: { desde: "2026-10-30T00:00:00Z", hasta: "2026-11-06T00:00:00Z" }, minimum_sample: { turns: 30, tasks: 5 },
    operational: {
      turns: 260, conversations: 61, escalated: 14, escalated_conversations: 9, failed: 1, without_outcome: 3, escalation_rate: 0.054,
      p95_ms: 2100, cost_usd: 2.4, cost_per_conversation_usd: 0.04,
      by_agent: [
        { instance_id: "ventas-c1", name: "Ventas", turns: 140, escalated: 8, escalation_rate: 0.057, p95_ms: 2000, cost_usd: 1.3 },
        { instance_id: "ventas-c2", name: "Ventas", turns: 60, escalated: 2, escalation_rate: 0.033, p95_ms: 2200, cost_usd: 0.6 },
        { instance_id: "general-c1", name: "General", turns: 60, escalated: 4, escalation_rate: 0.067, p95_ms: 1900, cost_usd: 0.5 },
      ],
    },
    verifier: [], completion: [], consistency: [], can_see_costs: true, can_see_conversations: true,
  };
  respuestas[`/admin/agents/${VENTAS_ID}/usage`] = {
    periodo: { desde: "2026-10-30T00:00:00Z", hasta: "2026-11-06T00:00:00Z" }, incluye_sin_atribuir: false,
    total: { turns: 200, input_tokens: 180000, output_tokens: 42000, cost_usd: 1.9 },
    by_connection: [], by_day: [], consistency: { scope: "negocio", measurements: [] },
  };
  respuestas[`/admin/agents/${VENTAS_ID}/conversations`] = { ...conversacionesDeAgente, total: 48 };
  respuestas["/admin/playground"] = { turns: [
    { role: "user", text: "Hola, ¿tienen la chaqueta azul en talla M?" },
    { role: "assistant", text: "¡Hola! Sí, nos quedan 3 en talla M a $189.900. ¿Te separo una?" },
  ] };
}
// AGENTES=1 (con FICHA_AGENTE=1 y RETIRADAS=limpio): lo que falta para recorrer toda la sección Agentes con datos:
// conversaciones, tareas, registros y clientes por agente, documentos de Conocimiento y las plantillas del asistente.
if (process.env.AGENTES === "1") {
  const GENERAL_ID = "00000000-0000-4000-8000-000000000001";
  const pagina = (items) => ({ items, total: items.length, page: 1, page_size: 20, has_more: false });
  const hace = (h) => new Date(Date.now() - h * 3600_000).toISOString();
  const conv = (n, nombre, canal, estado, turnos, costo, horas, conexion = "Chat de la tienda") => ({
    conversation_id: `00000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`, customer_id: `00000000-0000-4000-8000-0000000002${String(n).padStart(2, "0")}`,
    customer_name: nombre, channel: canal, status: estado, connection_id: "00000000-0000-4000-8000-0000000000c1", connection_label: conexion,
    agent_version: 3, turns: turnos, cost_usd: costo, last_turn_at: hace(horas),
  });
  const conversaciones = pagina([
    conv(1, "Ana Prueba", "web", "open", 8, 0.06, 1),
    conv(2, "Camilo Vega", "whatsapp", "open", 14, 0.11, 3, "WhatsApp ventas"),
    conv(3, null, "web", "resolved", 3, 0.02, 20),
    conv(4, "Laura Gómez", "whatsapp", "escalated", 22, 0.19, 30, "WhatsApp ventas"),
    conv(5, "Pedro Ruiz", "whatsapp", "resolved", 6, 0.04, 70, "WhatsApp ventas"),
  ]);
  conversaciones.total = 48;
  const tarea = (n, proc, estado, abierta, etapa, horas, motivo = null) => ({
    id: `t-${n}`, conversation_id: conversaciones.items[n % 5].conversation_id, procedure_id: proc, procedure_version: "1.2.0", status: estado, open: abierta,
    status_reason: motivo, stage: etapa, created_at: hace(horas + 1), updated_at: hace(horas), completed_at: abierta ? null : hace(horas), connection_id: "00000000-0000-4000-8000-0000000000c1",
  });
  const tareas = pagina([
    tarea(1, "pack_commerce.tomar_pedido", "active", true, "confirmar_direccion", 1),
    tarea(2, "pack_commerce.tomar_pedido", "suspended", true, "esperar_pago", 5),
    tarea(3, "pack_calendar.agendar_cita", "completed", false, "fin", 20),
    tarea(4, "pack_commerce.tomar_pedido", "failed", false, "cotizar", 30, "El producto ya no tiene stock."),
    tarea(5, "pack_commerce.tomar_pedido", "escalated", false, "confirmar_direccion", 50, "El cliente pidió hablar con una persona."),
  ]);
  const registro = (n, kind, ref, etiqueta, tool, horas) => ({
    id: `r-${n}`, pack_id: kind === "cita" ? "pack_calendar" : "pack_commerce", kind, record_ref: ref, label: etiqueta, tool,
    conversation_id: conversaciones.items[n % 5].conversation_id, connection_id: "00000000-0000-4000-8000-0000000000c1", connection_label: "Chat de la tienda", agent_version: 3, created_at: hace(horas),
  });
  const registros = pagina([
    registro(1, "pedido", "o-1", "PED-101 · $ 207.000", "pack_commerce.crear_pedido", 2),
    registro(2, "pedido", "o-2", "PED-102 · $ 59.000", "pack_commerce.crear_pedido", 5),
    registro(3, "cita", "e-1", "Entrega · jueves 13 de nov., 10:00 a. m.", "pack_calendar.crear_cita", 20),
  ]);
  const clientes = pagina([
    { customer_id: conversaciones.items[0].customer_id, name: "Ana Prueba", channel: "web", conversations: 2, turns: 12, last_turn_at: hace(1) },
    { customer_id: conversaciones.items[1].customer_id, name: "Camilo Vega", channel: "whatsapp", conversations: 1, turns: 14, last_turn_at: hace(3) },
    { customer_id: conversaciones.items[3].customer_id, name: "Laura Gómez", channel: "whatsapp", conversations: 3, turns: 30, last_turn_at: hace(30) },
  ]);
  const uso = {
    periodo: { desde: hace(24 * 30), hasta: hace(0) }, incluye_sin_atribuir: false,
    total: { turns: 410, input_tokens: 1_240_000, output_tokens: 210_000, cost_usd: 3.4 },
    by_connection: [
      { turns: 260, input_tokens: 800_000, output_tokens: 130_000, cost_usd: 2.1, connection_id: "00000000-0000-4000-8000-0000000000c1", connection_label: "Chat de la tienda" },
      { turns: 150, input_tokens: 440_000, output_tokens: 80_000, cost_usd: 1.3, connection_id: "00000000-0000-4000-8000-0000000000c2", connection_label: "WhatsApp ventas" },
    ],
    by_day: Array.from({ length: 14 }, (_, i) => ({ day: hace(24 * (13 - i)).slice(0, 10), turns: 10 + ((i * 7) % 25), input_tokens: 30_000, output_tokens: 5_000, cost_usd: 0.08 + (i % 4) * 0.02 })),
    consistency: { scope: "negocio", measurements: [] },
  };
  for (const ref of [VENTAS_ID, "general", GENERAL_ID]) {
    respuestas[`/admin/agents/${ref}/conversations`] = conversaciones;
    respuestas[`/admin/agents/${ref}/tasks`] = tareas;
    respuestas[`/admin/agents/${ref}/records`] = registros;
    respuestas[`/admin/agents/${ref}/customers`] = clientes;
    respuestas[`/admin/agents/${ref}/usage`] = uso;
  }
  respuestas[`/pack/pack_knowledge/agents/${VENTAS_ID}/documents`] = [
    { id: "d-1", agent_id: VENTAS_ID, titulo: "Catálogo de temporada.pdf", mime: "application/pdf", bytes: 2_400_000, estado: "listo", error_codigo: null, paginas: 18, num_fragmentos: 64, pii_detectada: 0, desactualizado: false, created_at: hace(200), processed_at: hace(199) },
    { id: "d-2", agent_id: VENTAS_ID, titulo: "Políticas de cambios y devoluciones.docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", bytes: 84_000, estado: "listo", error_codigo: null, paginas: 3, num_fragmentos: 9, pii_detectada: 2, desactualizado: true, created_at: hace(900), processed_at: hace(899) },
    { id: "d-3", agent_id: VENTAS_ID, titulo: "Tabla de envíos.xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes: 31_000, estado: "fallido", error_codigo: "formato_no_soportado", paginas: null, num_fragmentos: 0, pii_detectada: 0, desactualizado: false, created_at: hace(5), processed_at: null },
  ];
  const poder = (id, skill, title, description) => ({ id, version: "1.0.0", skill, title, description, phrases: ["a", "b", "c"] });
  const plantilla = (key, name, description, section, skills, available, extra = {}) => ({
    key, name, description, section, tools: [], skills, optional_skills: [], available, missing_skills: available ? [] : skills, will_enable: available ? [] : skills,
    superpowers: [], requirements: [], questions: [
      { id: "tono", text: "¿Cómo le habla a tus clientes?", help: "Puedes cambiarlo después.", type: "option", options: [{ id: "cercano", text: "Cercano", help: "Tutea y usa un tono cálido." }, { id: "formal", text: "Formal", help: "Trata de usted." }], default: "cercano" },
      { id: "objetivo", text: "¿Qué quieres que logre?", help: "", type: "text", options: [], default: null },
    ], ...extra,
  });
  // Propósito de cada agente y sus créditos del mes (AGT-01, AGT-03).
  respuestas["/admin/agents"] = [
    { id: GENERAL_ID, key: "general", name: "General", kind: "specialist", contract: "agentspec/3", description: "", status: "active", latest_version: 2, created_at: hace(2000) },
    { id: VENTAS_ID, key: "ventas", name: "Ventas", kind: "specialist", contract: "agentspec/3", description: "Toma pedidos, resuelve dudas de productos y agenda entregas", status: "active", latest_version: 3, created_at: hace(1500) },
  ];
  const plan = RESPUESTAS["/admin/plan"];
  if (process.env.CONSUMO !== "1") respuestas["/admin/plan"] = {
    ...plan,
    credit: { ...plan.credit, used: 4900, by_agent: [{ agent_id: VENTAS_ID, name: "Ventas", used: 3200 }, { agent_id: GENERAL_ID, name: "General", used: 1400 }, { agent_id: null, name: null, used: 300 }] },
  };
  respuestas["/admin/agent-templates"] = { items: [
    plantilla("ventas", "Ventas", "Toma pedidos, cotiza y resuelve dudas del catálogo.", "pack_commerce", ["pack_commerce"], true, { superpowers: [poder("pack_commerce.tomar_pedido", "pack_commerce", "Tomar un pedido", "Arma el pedido y lo confirma.")] }),
    plantilla("agenda", "Agenda", "Agenda, mueve y confirma citas.", "pack_calendar", ["pack_calendar"], true, { requirements: [{ skill: "pack_calendar", kind: "sin_contenido", title: "Aún no hay servicios", explanation: "Crea al menos un tipo de cita para que pueda agendar.", section: "pack_calendar", content: "servicios" }] }),
    plantilla("cobranza", "Cobranza", "Recuerda pagos y registra promesas.", "pack_cobranza", ["pack_cobranza"], false),
  ], total: 3, page: 1, page_size: 100, has_more: false };
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

// PLATAFORMA=1 (con MASTER=1): App de Meta con chequeos en verde y en rojo, requisitos de Embedded Signup a medias y
// el alta automática de SolversHub con sus documentos legales y dos altas en revisión.
if (process.env.PLATAFORMA === "1") {
  const hace = (h) => new Date(Date.now() - h * 3600_000).toISOString();
  const chequeo = (key, label, ok, detail = null, repair_action = null) => ({ key, label, ok, detail, repair_action, checked_at: hace(2) });
  respuestas["/admin/platform/meta-app"] = {
    run_id: "r-1", status: "done", ready: false, error: null, requested_at: hace(2.1), started_at: hace(2.05), finished_at: hace(2), meta_app_id: "1234567890123456",
    items: [
      chequeo("meta_app_configured", "App de Meta configurada", true, "META_APP_ID, META_APP_SECRET y META_CONFIG_ID configurados."),
      chequeo("prod_secret_differs_from_dev", "Secreto distinto del de desarrollo", true, "Distinto del de desarrollo"),
      chequeo("webhook_handshake", "Webhook verificado por Meta", true, "Handshake correcto"),
      chequeo("app_subscriptions_complete", "Suscripciones de la app", true),
      chequeo("token_keys_configured", "Claves de cifrado de tokens", true),
      chequeo("worker_heartbeat_and_dlq", "Trabajadores y mensajes fallidos", false, "DLQ con 3 eventos pendientes"),
      chequeo("connections_health", "Salud de las conexiones", null, "Sin conexiones para este tenant"),
    ],
  };
  const paso = (key, label, done, notes = null) => ({ key, label, help: "Se hace en el panel de Meta for Developers.", link: "https://developers.facebook.com/apps/", done, notes, updated_at: done ? hace(24 * 6) : null });
  respuestas["/admin/platform/meta-app/embedded-signup"] = {
    app_id: "1234567890123456", config_id: "987654321098765", graph_api_version: "v21.0", ready: false,
    platform_check: { status: "done", finished_at: hace(2), ok: false, pending: ["Trabajadores y mensajes fallidos"], expired: false, expires_at: hace(-24 * 3) },
    manual: [
      paso("business_verification", "Verificación del negocio en Meta", true),
      paso("tech_provider", "Registro como Tech Provider", true),
      paso("app_review", "Revisión de la app (permisos de WhatsApp)", false, "Enviada el 5 de nov.; Meta pidió un video."),
      paso("live_mode", "App en modo Live", false),
    ],
  };
  const doc = (tipo, nombre, version, dias) => ({ tipo, nombre, version, url: `https://solvershub.site/legal/${tipo}-${version}.pdf`, vigente_desde: hace(24 * dias), publicado_por: "Dueño de la plataforma" });
  const VENDEDOR = "7c1e0f4a-2b3d-4e5f-8a9b-0c1d2e3f4a5b";
  respuestas["/admin/platform/altas-automaticas"] = [{
    id: VENDEDOR, slug: "solvershub-comercial", name: "SolversHub (ventas)", activo: true,
    interruptor: { pausado: false, motivo: null, por: null, en: null },
    documentos: [doc("terminos", "Términos y condiciones", "2026-10", 30), doc("privacidad", "Aviso de privacidad", "2026-10", 30)],
    documentos_faltantes: ["dpa"], en_revision: 2,
  }];
  respuestas[`/admin/platform/altas-automaticas/${VENDEDOR}/documentos`] = [
    doc("terminos", "Términos y condiciones", "2026-10", 30), doc("privacidad", "Aviso de privacidad", "2026-10", 30), doc("terminos", "Términos y condiciones", "2026-08", 90),
  ];
  const alta = (ref, plan, motivo, horas) => ({ referencia: ref, estado: "revision", motivo, intentos: 1, plan_id: plan, negocio_slug: null, aprobada: false, created_at: hace(horas), updated_at: hace(horas) });
  respuestas[`/admin/platform/altas-automaticas/${VENDEDOR}/altas`] = [
    alta("ALTA-8F2K", "pro", "El correo del cliente ya tiene una cuenta.", 3),
    alta("ALTA-9Q7M", "basico", "Tres intentos de pago rechazados seguidos.", 20),
  ];
}

// SUSCRIPCIONES=1: un gimnasio con suscripciones en todos los estados (activa, en prueba, pendiente de pago, pausada por
// mora, vencida y cancelada), cuatro planes (uno inactivo), cobros pagados, pendientes y vencidos, avisos y métricas.
let suscripciones = null;
if (process.env.SUSCRIPCIONES === "1") {
  const dia = (d) => new Date(Date.now() + d * 86400_000).toISOString();
  const fecha = (d) => dia(d).slice(0, 10);
  const uuid = (n) => `5b0c0000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const P = { basico: uuid(101), pro: uuid(102), anual: uuid(103), verano: uuid(104) };
  const planes = [
    { id: P.basico, codigo: "basico", nombre: "Básico", descripcion: "Clases dos veces por semana.", precio: 49900, moneda: "COP", periodicidad: "mensual", trial_dias: 7, entitlements: {}, plan_plataforma: null, activo: true, orden: 1, creado: dia(-200), actualizado: dia(-30) },
    { id: P.pro, codigo: "pro", nombre: "Pro", descripcion: "Clases ilimitadas y una asesoría al mes.", precio: 99000, moneda: "COP", periodicidad: "mensual", trial_dias: 0, entitlements: {}, plan_plataforma: null, activo: true, orden: 2, creado: dia(-200), actualizado: dia(-60) },
    { id: P.anual, codigo: "pro_anual", nombre: "Pro anual", descripcion: "El plan Pro pagado por un año, con dos meses gratis.", precio: 990000, moneda: "COP", periodicidad: "anual", trial_dias: 0, entitlements: {}, plan_plataforma: null, activo: true, orden: 3, creado: dia(-150), actualizado: dia(-150) },
    { id: P.verano, codigo: "verano", nombre: "Promo verano", descripcion: "Tres meses a precio especial.", precio: 120000, moneda: "COP", periodicidad: "trimestral", trial_dias: 0, entitlements: {}, plan_plataforma: null, activo: false, orden: 4, creado: dia(-300), actualizado: dia(-120) },
  ];
  const cli = (n, nombre, tel) => ({ id: uuid(200 + n), nombre, telefono: tel, canal: "whatsapp" });
  const C = [cli(1, "Ana Pérez", "+57 300 000 0001"), cli(2, "Luis Gómez", "+57 300 000 0002"), cli(3, "Marta Ruiz", "+57 300 000 0003"), cli(4, "Carlos Díaz", "+57 300 000 0004"), cli(5, "Sofía León", "+57 300 000 0005"), cli(6, "Jorge Restrepo", "+57 300 000 0006"), cli(7, "Paula Mejía", "+57 300 000 0007"), cli(8, "Daniel Ortiz", "+57 300 000 0008")];
  const sub = (n, c, plan, estado, extra = {}) => {
    const p = planes.find((x) => x.id === plan);
    return { id: uuid(300 + n), cliente: c, plan: p.nombre, plan_id: plan, estado, motivo_pausa: null, periodicidad: p.periodicidad, valor_periodo: p.precio, moneda: "COP", proximo_cargo: null, trial_termina: null, fecha_alta: dia(-95), deuda: 0, cargos_pendientes: 0, en_mora: 0, dias_mora: null, ...extra };
  };
  const subs = [
    sub(1, C[0], P.pro, "activa", { proximo_cargo: fecha(12), fecha_alta: dia(-95) }),
    sub(2, C[1], P.basico, "trialing", { trial_termina: fecha(4), proximo_cargo: fecha(4), fecha_alta: dia(-3) }),
    sub(3, C[2], P.pro, "pausada", { motivo_pausa: "mora", deuda: 198000, cargos_pendientes: 2, en_mora: 198000, dias_mora: 38, fecha_alta: dia(-160) }),
    sub(4, C[3], P.basico, "activa", { proximo_cargo: fecha(24), deuda: 49900, cargos_pendientes: 1, en_mora: 49900, dias_mora: 6, fecha_alta: dia(-70) }),
    sub(5, C[4], P.anual, "activa", { proximo_cargo: fecha(210), fecha_alta: dia(-155) }),
    sub(6, C[5], P.basico, "pendiente_pago", { deuda: 49900, cargos_pendientes: 1, fecha_alta: dia(-1) }),
    sub(7, C[6], P.pro, "cancelada", { fecha_alta: dia(-200) }),
    sub(8, C[7], P.basico, "vencida", { deuda: 49900, cargos_pendientes: 1, en_mora: 49900, dias_mora: 64, fecha_alta: dia(-130) }),
  ];
  const periodo = (d) => dia(d).slice(0, 7);
  let nc = 0;
  const cargo = (s, d, estado, extra = {}) => ({ id: uuid(400 + ++nc), suscripcion_id: s.id, cliente: s.cliente, plan: s.plan, periodo: periodo(d), tipo: "periodo", monto: s.valor_periodo, moneda: "COP", estado, fecha_vencimiento: fecha(d), dias_mora: null, link_url: estado === "pendiente" ? "https://checkout.wompi.co/l/prueba" : null, pago_externo: null, creado: dia(d - 3), ...extra });
  const cargos = [
    cargo(subs[0], -18, "pagado", { pago_externo: { canal: "wompi" } }),
    cargo(subs[0], -48, "pagado", { pago_externo: { canal: "wompi" } }),
    cargo(subs[0], -95, "pagado", { tipo: "inscripcion", monto: 30000, pago_externo: { canal: "transferencia" } }),
    cargo(subs[2], -38, "pendiente", { dias_mora: 38 }),
    cargo(subs[2], -8, "pendiente", { dias_mora: 8 }),
    cargo(subs[2], -68, "pagado", { pago_externo: { canal: "efectivo" } }),
    cargo(subs[3], -6, "pendiente", { dias_mora: 6 }),
    cargo(subs[3], -36, "pagado", { pago_externo: { canal: "wompi" } }),
    cargo(subs[4], -155, "pagado", { pago_externo: { canal: "wompi" } }),
    cargo(subs[5], 2, "pendiente"),
    cargo(subs[7], -64, "pendiente", { dias_mora: 64 }),
    cargo(subs[6], -40, "anulado"),
  ];
  const pagina = (items, url) => {
    const tam = Number(url.searchParams.get("page_size") ?? 20);
    return { items: items.slice(0, tam), total: items.length, page: 1, page_size: tam, has_more: items.length > tam };
  };
  const busca = (url, c) => {
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    return !q || (c?.nombre ?? "").toLowerCase().includes(q) || (c?.telefono ?? "").includes(q);
  };
  const SP = "/pack/pack_subscriptions";
  respuestas[`${SP}/planes`] = planes;
  respuestas["/admin/settings/subscription-provider"] = { estado: "ok", configurado: "pack_subscriptions", efectivo: "pack_subscriptions", habilitados: [{ id: "pack_subscriptions", label: "Suscripciones" }], mensaje: "Los planes se cobran con la habilidad Suscripciones." };
  respuestas["/pack/commerce/pago-en-linea/minimo"] = { minimo: 1500, fuente: "pasarela", moneda: "COP", cuentas_de_transferencia: 1 };
  respuestas["/admin/datos-de-prueba/suscripciones"] = { modulo: "suscripciones", titulo: "Suscripciones", disponible: false, motivo: "Tu negocio ya tiene suscripciones.", falta_descripcion: false, lote: null };
  respuestas[`${SP}/metricas`] = {
    moneda: "COP", otras_monedas: 0, mrr: 99000 + 49900 + 82500, mrr_descuento: 0, suscripciones_con_descuento: 0, mrr_mes_anterior: 280300,
    activas: 3, en_prueba: 1, pendientes_de_pago: 1, pausadas: 1, vencidas: 1, canceladas: 1,
    altas_mes: 2, altas_mes_anterior: 3, bajas_mes: 1, bajas_mes_anterior: 0, churn_mes: 0.125,
    mora: { cargos: 4, monto: 297700, tramos: [{ etiqueta: "1 a 30 días", cargos: 2, monto: 148900 }, { etiqueta: "31 a 60 días", cargos: 1, monto: 99000 }, { etiqueta: "Más de 60 días", cargos: 1, monto: 49900 }] },
    cohortes: [
      { cohorte: periodo(-200), plan: "Pro", altas: 2, vigentes: 1 }, { cohorte: periodo(-160), plan: "Pro", altas: 1, vigentes: 1 },
      { cohorte: periodo(-130), plan: "Básico", altas: 2, vigentes: 1 }, { cohorte: periodo(-95), plan: "Pro", altas: 1, vigentes: 1 },
      { cohorte: periodo(-70), plan: "Básico", altas: 1, vigentes: 1 }, { cohorte: periodo(-3), plan: "Básico", altas: 2, vigentes: 2 },
    ],
    desde: fecha(-210),
  };
  const historial = (s) => [
    ...(s.estado === "pausada" ? [{ at: dia(-8), accion: "subs_pausada_por_mora", actor: "Sistema", detalle: "Dos cobros sin pagar." }, { at: dia(-30), accion: "subs_link_reenviado", actor: "Dueña", detalle: null }] : []),
    ...(s.estado === "cancelada" ? [{ at: dia(-40), accion: "subs_cancelada", actor: "Dueña", detalle: "Se mudó de ciudad." }] : []),
  ];
  const acciones = (s) => (s.estado === "pausada" ? ["reanudar", "cancelar"] : ["activa", "trialing", "vencida"].includes(s.estado) ? ["pausar", "cancelar"] : s.estado === "pendiente_pago" ? ["cancelar"] : []);
  suscripciones = (metodo, ruta, url) => {
    if (metodo !== "GET") return [200, { ok: true, suscripcion_estado: "activa" }];
    if (ruta === `${SP}/suscripciones`) {
      const estado = url.searchParams.get("estado"), plan = url.searchParams.get("plan_id"), cliente = url.searchParams.get("cliente_id");
      const items = subs.filter((s) => (!estado || s.estado === estado) && (!plan || s.plan_id === plan) && (!cliente || s.cliente.id === cliente) && (url.searchParams.get("con_mora") !== "true" || s.en_mora > 0) && busca(url, s.cliente));
      return [200, pagina(items, url)];
    }
    const una = ruta.match(/^\/pack\/pack_subscriptions\/suscripciones\/([^/]+)$/);
    if (una) {
      const s = subs.find((x) => x.id === una[1]);
      if (!s) return [404, { error: { code: "not_found", message: "No existe esa suscripción." } }];
      return [200, { ...s, fecha_cancelacion: s.estado === "cancelada" ? dia(-40) : null, cambio_programado: null, cargos: cargos.filter((c) => c.suscripcion_id === s.id), historial: historial(s), acciones: acciones(s) }];
    }
    if (ruta === `${SP}/cargos`) {
      const estado = url.searchParams.get("estado"), tipo = url.searchParams.get("tipo"), sid = url.searchParams.get("suscripcion_id");
      const items = cargos.filter((c) => (!estado || c.estado === estado) && (!tipo || c.tipo === tipo) && (!sid || c.suscripcion_id === sid) && (url.searchParams.get("vencidos") !== "true" || (c.dias_mora ?? 0) > 0) && busca(url, c.cliente));
      return [200, pagina(items, url)];
    }
    const avisosDe = ruta.match(/^\/pack\/pack_subscriptions\/cargos\/([^/]+)\/avisos$/);
    if (avisosDe) {
      const c = cargos.find((x) => x.id === avisosDe[1]);
      if (!c) return [200, []];
      const d = Math.round((Date.parse(c.creado) - Date.now()) / 86400_000);
      const lista = [{ evento: "subscription.charge_created", creado: dia(d), estado_evento: "entregado", intentos: 1, mensaje_estado: c.estado === "pagado" ? "read" : "delivered", plantilla: "cobro_con_link", enviado: dia(d) }];
      if (c.estado === "pendiente" && (c.dias_mora ?? 0) > 0) lista.unshift({ evento: "subscription.charge_reminder", creado: dia(d + 4), estado_evento: "entregado", intentos: 1, mensaje_estado: "delivered", plantilla: "recordatorio_pago", enviado: dia(d + 4) });
      if (c.estado === "pendiente" && (c.dias_mora ?? 0) > 30) lista.unshift({ evento: "subscription.paused", creado: dia(-8), estado_evento: "fallido", intentos: 3, mensaje_estado: null, mensaje_error: "sin_plantilla", plantilla: null, enviado: null });
      return [200, lista];
    }
    if (ruta === `${SP}/clientes`) {
      const items = C.map((c) => {
        const suyas = subs.filter((s) => s.cliente.id === c.id);
        const vivas = suyas.filter((s) => s.estado !== "cancelada");
        const mora = Math.max(0, ...suyas.map((s) => s.dias_mora ?? 0));
        return { cliente: c, suscripciones: suyas.length, vivas: vivas.length, planes: [...new Set(suyas.map((s) => s.plan))], deuda: suyas.reduce((t, s) => t + s.deuda, 0), en_mora: suyas.reduce((t, s) => t + s.en_mora, 0), dias_mora: mora || null, ultimo_periodo_pagado: suyas.some((s) => s.estado === "activa") ? periodo(-18) : null };
      }).filter((f) => (url.searchParams.get("incluir_canceladas") === "true" || f.vivas > 0) && (url.searchParams.get("con_mora") !== "true" || f.en_mora > 0) && busca(url, f.cliente));
      return [200, pagina(items, url)];
    }
    return null;
  };
}

// PRUEBAS=1: la sección global `qa` (después de MASTER=1/TESTER=1, que reescriben /admin/me).
if (process.env.PRUEBAS === "1") {
  const yo = respuestas["/admin/me"];
  respuestas["/admin/me"] = { ...yo, permissions: { ...(yo.permissions ?? {}), qa: "write" }, qa_testers_habilitados: true };
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
  // SESION_REAL=1: sin `Authorization` (sin la cookie de sesión) `/admin/me` responde 401, como la API: deja ver el login.
  if (process.env.SESION_REAL === "1" && ruta === "/admin/me" && !req.headers.authorization) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: { code: "unauthorized", message: "Sin sesión" } }));
    return;
  }
  if (req.method === "GET" && (ruta === "/access/devices" || ruta === "/access/events")) {
    res.end(JSON.stringify(seguridad(ruta, url)));
    return;
  }
  if (suscripciones && ruta.startsWith("/pack/pack_subscriptions/")) {
    const r = suscripciones(req.method ?? "GET", ruta, url);
    if (r) {
      res.statusCode = r[0];
      res.end(JSON.stringify(r[1]));
      return;
    }
  }
  if (pruebas && ruta.startsWith("/admin/qa/")) {
    const r = pruebas(req.method ?? "GET", ruta, url);
    if (r) {
      res.statusCode = r[0];
      res.end(JSON.stringify(r[1]));
      return;
    }
  }
  if (comercio && ruta.startsWith("/pack/commerce/")) {
    let texto = "";
    for await (const trozo of req) texto += trozo;
    const r = comercio(req.method ?? "GET", ruta, url, texto ? JSON.parse(texto) : {});
    if (r) {
      res.statusCode = r[0];
      for (const [k, v] of Object.entries(r[2] ?? {})) res.setHeader(k, v);
      res.end(r[1] === null ? undefined : JSON.stringify(r[1]));
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
