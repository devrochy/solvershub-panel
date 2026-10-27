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
//
// Luego, en otra terminal:
//   AGENT_CORE_API_URL=http://localhost:8765 npm run start -- -p 3293
// y en el navegador crea la cookie de sesión de prueba (cualquier valor sirve):
//   document.cookie = "panel_session=prueba; path=/"
//
// Las rutas sin fixture responden 404 (la página muestra su estado de error).

import { createServer } from "node:http";

const { RESPUESTAS, accionesDeOpciones, ajustes, dosAgendas, eventosAgenda, listaDeOpciones, me, plantillaDeOpciones, variablesDeOpciones } =
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

// SOLO_LECTURA=1: quien mira no es el propietario (plantillas con opciones en solo lectura).
if (process.env.SOLO_LECTURA === "1") {
  respuestas["/admin/me"] = { ...me, role: "agent", tenant: { ...me.tenant, role: "agent" } };
}

// Plantillas con opciones (SPEC-40, HU-OPC-06), con estado en memoria y un lint mínimo con las reglas
// del backend para ver los hallazgos junto a su campo. OPCIONES_BANDERA=0 apaga la función (404 por negocio).
const bandera = process.env.OPCIONES_BANDERA !== "0";
const plantillasOpciones = new Map([
  ["confirmar_cita", structuredClone(plantillaDeOpciones)],
  ...listaDeOpciones.plantillas
    .filter((p) => p.clave !== "confirmar_cita")
    .map((p) => [p.clave, { ...p, borrador: p.estado === "retired" ? plantillaDeOpciones.borrador : null, definicion_vigente: null, versiones: [] }]),
]);
const enviosOpciones = new Map();
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
  if (!bandera) return errorOpciones(404, "opciones_directas_no_habilitadas", "Las opciones directas no están habilitadas en este negocio.");
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
    p.versiones = [{ version_n: p.version_vigente, publicada_en: ahora, retirada_en: null, definition_hash: "c".repeat(64), message_template_id: null, vigente: true }, ...p.versiones.map((v) => ({ ...v, vigente: false }))];
    return [201, { clave: p.clave, version_n: p.version_vigente, definition_hash: "c".repeat(64), publicada_en: ahora, message_template_id: null, hallazgos }];
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
