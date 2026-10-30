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
//   MASTER=1 (quien mira es el admin de plataforma: Tenants con el interruptor de plantillas con opciones)
//   El playground (SPEC-40, pista B2) simula `/admin/playground/{options,tap}` con las plantillas publicadas: cada botón
//   ejecuta una sola vez (el segundo toque es `duplicate`); OPCIONES_BANDERA=0 los apaga (404 por negocio).
//   Avisos por evento (Plantillas → Por evento) y su texto por canal; el interruptor «Avisos por canal» de Tenants (MASTER=1).
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

const puerto = Number(process.env.PUERTO ?? 8765);
const respuestas = { ...RESPUESTAS };
if (process.env.BOT_PAUSADO === "1") {
  respuestas["/admin/settings"] = { ...ajustes, identity: { ...ajustes.identity, bot_paused: true } };
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

// SOLO_LECTURA=1: quien mira no es el propietario (plantillas con opciones en solo lectura).
if (process.env.SOLO_LECTURA === "1") {
  respuestas["/admin/me"] = { ...me, role: "agent", tenant: { ...me.tenant, role: "agent" } };
}

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
const ALIADOS = { habilitado: false };
// Avisos por canal (ADR-0178 D2): su bandera por negocio también vive en memoria (apagada al inicio).
const avisosPorCanal = new Map();
function plataforma(metodo, ruta, cuerpo) {
  const m = /^\/(?:admin|pack\/commerce)\/platform\/tenants\/([^/]+)\/(opciones-directas|avisos-por-canal|agent-os|aliados)$/.exec(ruta);
  if (!m) return undefined;
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

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const ruta = url.pathname.replace(/^\/api\/v1/, "");
  res.setHeader("Content-Type", "application/json");
  if (ruta === "/plantillas-opciones" || ruta.startsWith("/plantillas-opciones/")) {
    let texto = "";
    for await (const trozo of req) texto += trozo;
    const [estado, cuerpo] = opciones(req.method ?? "GET", ruta.split("/").slice(2), texto ? JSON.parse(texto) : {});
    res.statusCode = estado;
    res.end(cuerpo === null ? undefined : JSON.stringify(cuerpo));
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
